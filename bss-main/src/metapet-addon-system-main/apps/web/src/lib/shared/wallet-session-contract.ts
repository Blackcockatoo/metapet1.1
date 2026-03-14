import { z } from "zod";

export const walletSessionChallengeRequestSchema = z.object({
  ownerPublicKey: z.string().min(1)
});

export const walletSessionChallengeSchema = z.object({
  kind: z.literal("wallet-auth-challenge"),
  challengeId: z.string().min(1),
  ownerPublicKey: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});

export const walletSessionChallengeResponseSchema = z.object({
  challenge: walletSessionChallengeSchema,
  challengeToken: z.string().min(1)
});

export const walletSessionVerifyRequestSchema = z.object({
  challengeToken: z.string().min(1),
  signature: z.string().min(1)
});

export const walletSessionSchema = z.object({
  kind: z.literal("wallet-session"),
  sessionId: z.string().min(1),
  ownerPublicKey: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});

export const walletSessionVerifyResponseSchema = z.object({
  session: walletSessionSchema,
  sessionToken: z.string().min(1)
});

export type WalletSessionChallengeRequest = z.infer<typeof walletSessionChallengeRequestSchema>;
export type WalletSessionChallenge = z.infer<typeof walletSessionChallengeSchema>;
export type WalletSessionChallengeResponse = z.infer<typeof walletSessionChallengeResponseSchema>;
export type WalletSessionVerifyRequest = z.infer<typeof walletSessionVerifyRequestSchema>;
export type WalletSession = z.infer<typeof walletSessionSchema>;
export type WalletSessionVerifyResponse = z.infer<typeof walletSessionVerifyResponseSchema>;
