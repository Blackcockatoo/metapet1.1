import { z } from "zod";

import { receiverAttestationSchema } from "@/lib/shared/receiver-attestation";

export const walletTransferPrepareRequestSchema = z.object({
  addonId: z.string().min(1),
  toOwnerPublicKey: z.string().min(1),
  receiverConsentRequested: z.boolean().optional()
});

export const walletTransferReceiverConsentChallengeSchema = z.object({
  requestId: z.string().min(1),
  addonId: z.string().min(1),
  fromOwnerPublicKey: z.string().min(1),
  toOwnerPublicKey: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});

export const walletTransferPrepareResponseSchema = z.object({
  requestId: z.string().min(1),
  addonId: z.string().min(1),
  fromOwnerPublicKey: z.string().min(1),
  toOwnerPublicKey: z.string().min(1),
  nonce: z.string().min(1),
  timestampMs: z.number().int().positive(),
  ttlMs: z.number().int().positive(),
  receiverConsentRequired: z.boolean(),
  receiverConsentChallenge: walletTransferReceiverConsentChallengeSchema.optional()
});

export const walletTransferSubmitRequestSchema = z.object({
  requestId: z.string().min(1),
  addonId: z.string().min(1),
  fromOwnerPublicKey: z.string().min(1),
  toOwnerPublicKey: z.string().min(1),
  receiverConsent: receiverAttestationSchema.optional(),
  nonce: z.string().min(1),
  timestampMs: z.number().int().positive(),
  ttlMs: z.number().int().positive(),
  signature: z.string().min(1)
});

export const walletTransferSubmitResponseSchema = z.object({
  ok: z.literal(true),
  requestId: z.string().min(1),
  addonId: z.string().min(1),
  fromOwnerPublicKey: z.string().min(1),
  toOwnerPublicKey: z.string().min(1),
  nonce: z.string().min(1),
  timestampMs: z.number().int().positive(),
  ttlMs: z.number().int().positive()
});

export type WalletTransferPrepareRequest = z.infer<typeof walletTransferPrepareRequestSchema>;
export type WalletTransferPrepareResponse = z.infer<typeof walletTransferPrepareResponseSchema>;
export type WalletTransferSubmitRequest = z.infer<typeof walletTransferSubmitRequestSchema>;
export type WalletTransferSubmitResponse = z.infer<typeof walletTransferSubmitResponseSchema>;
