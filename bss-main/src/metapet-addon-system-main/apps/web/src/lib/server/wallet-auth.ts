import { canonicalSerialize, importPublicKey, verifyCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import { createHmac, timingSafeEqual } from "node:crypto";
import { parseServerEnv } from "@bluesnake-studios/config";

import { ApiRouteError } from "@/lib/server/api-errors";
import { getWalletSessionRecord, persistWalletSession, revokeWalletSessionRecord } from "@/lib/server/wallet-session-repository";
import {
  walletSessionChallengeRequestSchema,
  walletSessionChallengeSchema,
  walletSessionVerifyRequestSchema,
  walletSessionSchema,
  type WalletSession
} from "@/lib/shared/wallet-session-contract";

function requireWalletSessionSecret(): string {
  const env = parseServerEnv(process.env);

  if (!env.WALLET_SESSION_SECRET) {
    throw new ApiRouteError(500, "internal_error", "Wallet session auth is not configured. Set WALLET_SESSION_SECRET.");
  }

  return env.WALLET_SESSION_SECRET;
}

function isTokenValid(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }

  return timingSafeEqual(a, b);
}

function signTokenPayload(payload: unknown, secret: string): string {
  const payloadSegment = Buffer.from(canonicalSerialize(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(payloadSegment).digest("base64url");
  return `${payloadSegment}.${signature}`;
}

function verifySignedToken<T>(token: string, secret: string): T {
  const [payloadSegment, signature] = token.split(".");

  if (!payloadSegment || !signature) {
    throw new ApiRouteError(401, "unauthorized", "Wallet session token is malformed.");
  }

  const expectedSignature = createHmac("sha256", secret).update(payloadSegment).digest("base64url");

  if (!isTokenValid(signature, expectedSignature)) {
    throw new ApiRouteError(401, "unauthorized", "Wallet session token is invalid.");
  }

  const payload = Buffer.from(payloadSegment, "base64url").toString("utf8");
  return JSON.parse(payload) as T;
}

function assertNotExpired(expiresAt: string, label: string): void {
  if (new Date(expiresAt).getTime() <= Date.now()) {
    throw new ApiRouteError(401, "unauthorized", `${label} has expired.`);
  }
}

function assertWalletSessionRecordMatchesToken(session: WalletSession, record: { ownerPublicKey: string; issuedAt: string; expiresAt: string; status: string }): void {
  if (
    record.ownerPublicKey !== session.ownerPublicKey ||
    record.issuedAt !== session.issuedAt ||
    record.expiresAt !== session.expiresAt
  ) {
    throw new ApiRouteError(401, "unauthorized", "Wallet session token does not match the persisted session state.");
  }

  if (record.status !== "active") {
    throw new ApiRouteError(401, "unauthorized", "Wallet session has been revoked.");
  }
}

export async function issueWalletSessionChallenge(body: unknown) {
  const payload = walletSessionChallengeRequestSchema.parse(body);
  const env = parseServerEnv(process.env);
  const secret = requireWalletSessionSecret();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + env.WALLET_CHALLENGE_TTL_MS).toISOString();
  const challenge = walletSessionChallengeSchema.parse({
    kind: "wallet-auth-challenge",
    challengeId: `wallet-challenge-${crypto.randomUUID()}`,
    ownerPublicKey: payload.ownerPublicKey,
    issuedAt,
    expiresAt
  });

  return {
    challenge,
    challengeToken: signTokenPayload(challenge, secret)
  };
}

export async function verifyWalletSessionChallenge(body: unknown) {
  const payload = walletSessionVerifyRequestSchema.parse(body);
  const env = parseServerEnv(process.env);
  const secret = requireWalletSessionSecret();
  const challenge = walletSessionChallengeSchema.parse(verifySignedToken(payload.challengeToken, secret));

  assertNotExpired(challenge.expiresAt, "Wallet auth challenge");

  const publicKey = await importPublicKey(challenge.ownerPublicKey);
  const verified = await verifyCanonicalPayload(challenge, payload.signature, publicKey);

  if (!verified) {
    throw new ApiRouteError(401, "unauthorized", "Wallet auth signature is invalid.");
  }

  const session = walletSessionSchema.parse({
    kind: "wallet-session",
    sessionId: `wallet-session-${crypto.randomUUID()}`,
    ownerPublicKey: challenge.ownerPublicKey,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + env.WALLET_SESSION_TTL_MS).toISOString()
  });

  await persistWalletSession({
    sessionId: session.sessionId,
    ownerPublicKey: session.ownerPublicKey,
    status: "active",
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt
  });

  return {
    session,
    sessionToken: signTokenPayload(session, secret)
  };
}

function readWalletSessionToken(request: Request): string {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const headerToken = request.headers.get("x-wallet-session");

  if (headerToken && headerToken.trim().length > 0) {
    return headerToken.trim();
  }

  throw new ApiRouteError(401, "unauthorized", "Wallet session is required.");
}

export async function requireWalletSession(request: Request): Promise<WalletSession> {
  const secret = requireWalletSessionSecret();
  const session = walletSessionSchema.parse(verifySignedToken<WalletSession>(readWalletSessionToken(request), secret));

  assertNotExpired(session.expiresAt, "Wallet session");
  const record = await getWalletSessionRecord(session.sessionId);

  if (!record) {
    throw new ApiRouteError(401, "unauthorized", "Wallet session is not recognized.");
  }

  assertNotExpired(record.expiresAt, "Wallet session");
  assertWalletSessionRecordMatchesToken(session, record);
  return session;
}

export async function revokeWalletSession(sessionId: string): Promise<boolean> {
  return revokeWalletSessionRecord(sessionId, new Date().toISOString());
}
