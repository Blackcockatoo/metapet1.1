import type { TransferConsent } from "@bluesnake-studios/addon-core";
import { z } from "zod";

export const receiverAttestationPayloadSchema = z.object({
  kind: z.literal("receiver-attestation"),
  requestId: z.string().min(1),
  addonId: z.string().min(1),
  fromOwnerPublicKey: z.string().min(1),
  toOwnerPublicKey: z.string().min(1),
  receiverPublicKey: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime()
});

export const receiverAttestationSchema = z.object({
  requestId: z.string().min(1),
  addonId: z.string().min(1),
  fromOwnerPublicKey: z.string().min(1),
  toOwnerPublicKey: z.string().min(1),
  receiverPublicKey: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime(),
  signature: z.string().min(1)
}) satisfies z.ZodType<TransferConsent>;

export type ReceiverAttestationPayload = z.infer<typeof receiverAttestationPayloadSchema>;

export function toReceiverAttestationPayload(attestation: TransferConsent): ReceiverAttestationPayload {
  return receiverAttestationPayloadSchema.parse({
    kind: "receiver-attestation",
    requestId: attestation.requestId,
    addonId: attestation.addonId,
    fromOwnerPublicKey: attestation.fromOwnerPublicKey,
    toOwnerPublicKey: attestation.toOwnerPublicKey,
    receiverPublicKey: attestation.receiverPublicKey,
    issuedAt: attestation.issuedAt,
    expiresAt: attestation.expiresAt,
    acceptedAt: attestation.acceptedAt
  });
}
