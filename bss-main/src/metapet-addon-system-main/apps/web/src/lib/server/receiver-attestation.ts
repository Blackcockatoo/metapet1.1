import type { TransferConsent } from "@bluesnake-studios/addon-core";
import { importPublicKey, verifyCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import { parseServerEnv } from "@bluesnake-studios/config";
import { z } from "zod";

import { receiverAttestationSchema, toReceiverAttestationPayload } from "@/lib/shared/receiver-attestation";

export type ReceiverAttestationErrorCode =
  | "RECEIVER_ATTESTATION_REQUIRED"
  | "RECEIVER_ATTESTATION_INVALID"
  | "RECEIVER_ATTESTATION_REVOKED"
  | "RECEIVER_ATTESTATION_EXPIRED";

export class ReceiverAttestationError extends Error {
  constructor(public readonly code: ReceiverAttestationErrorCode, message: string) {
    super(message);
    this.name = "ReceiverAttestationError";
  }
}

const revokedReceiverAttestationIdsSchema = z.array(z.string().trim().min(1));

function listRevokedReceiverAttestationIds(source: Record<string, string | undefined> = process.env): string[] {
  const env = parseServerEnv(source);
  const raw = env.TRANSFER_REVOKED_RECEIVER_CONSENT_IDS_JSON;

  if (!raw) {
    return [];
  }

  return revokedReceiverAttestationIdsSchema.parse(JSON.parse(raw) as unknown);
}

function ensureReceiverAttestationTiming(attestation: TransferConsent, nowMs: number): void {
  const issuedAtMs = new Date(attestation.issuedAt).getTime();
  const acceptedAtMs = new Date(attestation.acceptedAt).getTime();
  const expiresAtMs = new Date(attestation.expiresAt).getTime();

  if (acceptedAtMs < issuedAtMs) {
    throw new ReceiverAttestationError("RECEIVER_ATTESTATION_INVALID", "Receiver attestation cannot be accepted before it was issued.");
  }

  if (acceptedAtMs > expiresAtMs) {
    throw new ReceiverAttestationError("RECEIVER_ATTESTATION_EXPIRED", "Receiver attestation was accepted after it expired.");
  }

  if (expiresAtMs <= nowMs) {
    throw new ReceiverAttestationError("RECEIVER_ATTESTATION_EXPIRED", "Receiver attestation has expired.");
  }
}

function ensureReceiverAttestationMatchesTransfer(
  attestation: TransferConsent,
  expected: { addonId: string; fromOwnerPublicKey: string; toOwnerPublicKey: string; requestId?: string }
): void {
  if (attestation.addonId !== expected.addonId) {
    throw new ReceiverAttestationError("RECEIVER_ATTESTATION_INVALID", "Receiver attestation must match the transfer add-on ID.");
  }

  if (attestation.fromOwnerPublicKey !== expected.fromOwnerPublicKey) {
    throw new ReceiverAttestationError("RECEIVER_ATTESTATION_INVALID", "Receiver attestation must match the source owner public key.");
  }

  if (attestation.toOwnerPublicKey !== expected.toOwnerPublicKey || attestation.receiverPublicKey !== expected.toOwnerPublicKey) {
    throw new ReceiverAttestationError("RECEIVER_ATTESTATION_INVALID", "Receiver attestation must match the destination owner public key.");
  }

  if (expected.requestId && attestation.requestId !== expected.requestId) {
    throw new ReceiverAttestationError("RECEIVER_ATTESTATION_INVALID", "Receiver attestation must match the transfer request ID.");
  }
}

function ensureReceiverAttestationNotRevoked(attestation: TransferConsent, source: Record<string, string | undefined>): void {
  if (listRevokedReceiverAttestationIds(source).includes(attestation.requestId)) {
    throw new ReceiverAttestationError("RECEIVER_ATTESTATION_REVOKED", "Receiver attestation has been revoked by server policy.");
  }
}

export async function validateReceiverAttestation(
  receiverConsent: TransferConsent | undefined,
  expected: { addonId: string; fromOwnerPublicKey: string; toOwnerPublicKey: string; requestId?: string; requireReceiverConsent?: boolean },
  source: Record<string, string | undefined> = process.env,
  nowMs = Date.now()
): Promise<void> {
  if (!receiverConsent) {
    if (expected.requireReceiverConsent) {
      throw new ReceiverAttestationError("RECEIVER_ATTESTATION_REQUIRED", "Receiver attestation is required for this transfer.");
    }

    return;
  }

  const attestation = receiverAttestationSchema.parse(receiverConsent);

  ensureReceiverAttestationMatchesTransfer(attestation, expected);
  ensureReceiverAttestationTiming(attestation, nowMs);
  ensureReceiverAttestationNotRevoked(attestation, source);

  const publicKey = await importPublicKey(attestation.receiverPublicKey);
  const verified = await verifyCanonicalPayload(toReceiverAttestationPayload(attestation), attestation.signature, publicKey);

  if (!verified) {
    throw new ReceiverAttestationError("RECEIVER_ATTESTATION_INVALID", "Receiver attestation signature is invalid.");
  }
}
