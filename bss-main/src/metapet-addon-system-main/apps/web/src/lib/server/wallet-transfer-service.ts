import { createTransferDraft } from "@bluesnake-studios/addon-minting";
import { parseServerEnv } from "@bluesnake-studios/config";

import { runAppDatabaseTransaction } from "@/lib/server/app-database-adapter";
import { apiError } from "@/lib/server/api-errors";
import { loadInventorySnapshot, transferOwnedAddon } from "@/lib/server/inventory-repository";
import { ReceiverAttestationError, validateReceiverAttestation } from "@/lib/server/receiver-attestation";
import { isDirectWalletTransferEnabled } from "@/lib/server/transfer-policy";
import { consumeTransferReplayRequest, verifyTransferRequestSignature } from "@/lib/server/transfer-verifier";
import {
  walletTransferPrepareResponseSchema,
  walletTransferSubmitResponseSchema,
  walletTransferPrepareRequestSchema,
  walletTransferSubmitRequestSchema
} from "@/lib/shared/wallet-transfer-contract";

export interface WalletTransferRequestContext {
  sessionId: string;
  sessionOwnerPublicKey: string;
  requireReceiverConsent?: boolean;
}

function walletTransferDisabled() {
  return apiError(404, "not_found", "Direct wallet transfer routes are disabled.");
}

function walletTransferSessionMismatch() {
  return apiError(403, "unauthorized", "Wallet session does not match the source owner for this transfer.");
}

function toWalletTransferFailure(message: string) {
  return apiError(400, "integrity_failed", message);
}

function toReceiverAttestationFailure(error: unknown) {
  if (error instanceof ReceiverAttestationError) {
    return apiError(
      error.code === "RECEIVER_ATTESTATION_REQUIRED" || error.code === "RECEIVER_ATTESTATION_INVALID" ? 400 : 409,
      "integrity_failed",
      error.message
    );
  }

  return toWalletTransferFailure(error instanceof Error ? error.message : "Wallet transfer validation failed.");
}

export async function prepareWalletTransferFromRequest(body: unknown, context: WalletTransferRequestContext) {
  if (!isDirectWalletTransferEnabled()) {
    return walletTransferDisabled();
  }

  const payload = walletTransferPrepareRequestSchema.parse(body);

  if (payload.toOwnerPublicKey === context.sessionOwnerPublicKey) {
    return toWalletTransferFailure("fromOwnerPublicKey and toOwnerPublicKey must be different.");
  }

  const snapshot = await loadInventorySnapshot(context.sessionOwnerPublicKey);
  const addon = snapshot?.addons[payload.addonId];

  if (!addon) {
    return apiError(404, "not_found", "Addon not found for the wallet session owner.");
  }

  const env = parseServerEnv(process.env);
  const nowMs = Date.now();
  const issuedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + env.WALLET_TRANSFER_TTL_MS).toISOString();
  const requestId = `wallet-transfer-${crypto.randomUUID()}`;
  const receiverConsentRequired = context.requireReceiverConsent === true;

  return {
    status: 200,
    body: walletTransferPrepareResponseSchema.parse({
      requestId,
      addonId: payload.addonId,
      fromOwnerPublicKey: context.sessionOwnerPublicKey,
      toOwnerPublicKey: payload.toOwnerPublicKey,
      nonce: crypto.randomUUID(),
      timestampMs: nowMs,
      ttlMs: env.WALLET_TRANSFER_TTL_MS,
      receiverConsentRequired,
      receiverConsentChallenge:
        receiverConsentRequired || payload.receiverConsentRequested
          ? {
              requestId,
              addonId: payload.addonId,
              fromOwnerPublicKey: context.sessionOwnerPublicKey,
              toOwnerPublicKey: payload.toOwnerPublicKey,
              issuedAt,
              expiresAt
            }
          : undefined
    })
  };
}

export async function submitWalletTransferFromRequest(body: unknown, context: WalletTransferRequestContext) {
  if (!isDirectWalletTransferEnabled()) {
    return walletTransferDisabled();
  }

  const payload = walletTransferSubmitRequestSchema.parse(body);

  if (payload.fromOwnerPublicKey !== context.sessionOwnerPublicKey) {
    return walletTransferSessionMismatch();
  }

  const verification = await verifyTransferRequestSignature(payload);

  if (!verification.ok) {
    if (verification.reason === "invalid_signature") {
      return apiError(401, "unauthorized", "Wallet transfer signature is invalid.");
    }

      return apiError(
        409,
        "integrity_failed",
        "Wallet transfer request has expired."
      );
    }

  try {
    await validateReceiverAttestation(payload.receiverConsent, {
      addonId: payload.addonId,
      fromOwnerPublicKey: payload.fromOwnerPublicKey,
      toOwnerPublicKey: payload.toOwnerPublicKey,
      requestId: payload.requestId,
      requireReceiverConsent: context.requireReceiverConsent
    });

    createTransferDraft(
      {
        addonId: payload.addonId,
        fromOwnerPublicKey: payload.fromOwnerPublicKey,
        toOwnerPublicKey: payload.toOwnerPublicKey,
        nonce: payload.nonce,
        issuedAt: new Date(payload.timestampMs).toISOString(),
        expiresAt: new Date(payload.timestampMs + payload.ttlMs).toISOString(),
        receiverConsent: payload.receiverConsent
      },
      { requireReceiverConsent: context.requireReceiverConsent }
    );
  } catch (error) {
    return toReceiverAttestationFailure(error);
  }

  const transferred = await runAppDatabaseTransaction(async (transaction) => {
    const replayStatus = await consumeTransferReplayRequest(payload, Date.now(), transaction);

    if (!replayStatus.ok) {
      return replayStatus.reason;
    }

    return transferOwnedAddon(payload.addonId, payload.fromOwnerPublicKey, payload.toOwnerPublicKey, transaction);
  });

  if (transferred === "replay" || transferred === "expired") {
    return apiError(
      409,
      "integrity_failed",
      transferred === "replay" ? "Wallet transfer nonce has already been used." : "Wallet transfer request has expired."
    );
  }

  if (!transferred) {
    return apiError(404, "not_found", "Addon not found for the wallet session owner.");
  }

  return {
    status: 200,
    body: walletTransferSubmitResponseSchema.parse({
      ok: true,
      requestId: payload.requestId,
      addonId: payload.addonId,
      fromOwnerPublicKey: payload.fromOwnerPublicKey,
      toOwnerPublicKey: payload.toOwnerPublicKey,
      nonce: payload.nonce,
      timestampMs: payload.timestampMs,
      ttlMs: payload.ttlMs
    })
  };
}
