import { importPublicKey, verifyCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import { z } from "zod";

import type { AppDatabaseTransaction } from "@/lib/server/app-database-adapter";
import { clearReplayNonceRecords, consumeReplayNonce } from "@/lib/server/replay-repository";
import { receiverAttestationSchema } from "@/lib/shared/receiver-attestation";

/**
 * Minimal transfer request accepted when the caller already holds admin authority.
 * The admin token (validated by requireAdminSession) acts as the trust boundary;
 * no owner signature is required.
 */
export const adminTransferSchema = z.object({
  addonId: z.string().min(1),
  fromOwnerPublicKey: z.string().min(1),
  toOwnerPublicKey: z.string().min(1),
  receiverConsent: receiverAttestationSchema.optional()
});

export type AdminTransferRequest = z.infer<typeof adminTransferSchema>;

/**
 * Full owner-signed transfer contract for the admin-authorized transfer route.
 * The source owner signs the canonical payload with their private key; the server
 * verifies signature, nonce, and TTL before executing the transfer.
 *
 * Note: direct non-admin wallet submission of this contract is explicitly deferred;
 * this schema currently applies only to admin-authorized requests.
 */
export const transferRequestSchema = z.object({
  addonId: z.string().min(1),
  fromOwnerPublicKey: z.string().min(1),
  toOwnerPublicKey: z.string().min(1),
  receiverConsent: receiverAttestationSchema.optional(),
  nonce: z.string().min(1),
  timestampMs: z.number().int().positive(),
  ttlMs: z.number().int().positive(),
  signature: z.string().min(1)
});

export type SignedTransferRequest = z.infer<typeof transferRequestSchema>;

export async function resetTransferReplayGuard(): Promise<void> {
  await clearReplayNonceRecords();
}

export type TransferVerificationResult =
  | { ok: true }
  | { ok: false; reason: "replay" | "expired" | "invalid_signature" };

export async function verifyTransferRequestSignature(
  request: SignedTransferRequest,
  nowMs = Date.now()
): Promise<TransferVerificationResult> {
  const sourcePublicKey = await importPublicKey(request.fromOwnerPublicKey);
  const payload = {
    addonId: request.addonId,
    fromOwnerPublicKey: request.fromOwnerPublicKey,
    toOwnerPublicKey: request.toOwnerPublicKey,
    nonce: request.nonce,
    timestampMs: request.timestampMs,
    ttlMs: request.ttlMs
  };

  const verified = await verifyCanonicalPayload(payload, request.signature, sourcePublicKey);

  if (!verified) {
    return { ok: false, reason: "invalid_signature" };
  }

  if (request.timestampMs + request.ttlMs <= nowMs) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true };
}

export async function consumeTransferReplayRequest(
  request: SignedTransferRequest,
  nowMs = Date.now(),
  storage?: Pick<AppDatabaseTransaction, "upsertReplayNonce">
): Promise<Exclude<TransferVerificationResult, { ok: false; reason: "invalid_signature" }>> {
  if (request.timestampMs + request.ttlMs <= nowMs) {
    return { ok: false, reason: "expired" };
  }

  const replayStatus = await consumeReplayNonce(
    {
      operation: "transfer",
      scopeKey: request.fromOwnerPublicKey,
      nonce: request.nonce,
      timestampMs: request.timestampMs,
      ttlMs: request.ttlMs,
      nowMs
    },
    storage
  );

  if (replayStatus === "replayed") {
    return { ok: false, reason: "replay" };
  }

  if (replayStatus === "expired") {
    return { ok: false, reason: "expired" };
  }

  return { ok: true };
}

export async function verifySignedTransferRequest(
  request: SignedTransferRequest,
  nowMs = Date.now()
): Promise<TransferVerificationResult> {
  const signatureResult = await verifyTransferRequestSignature(request, nowMs);

  if (!signatureResult.ok) {
    return signatureResult;
  }

  return consumeTransferReplayRequest(request, nowMs);
}
