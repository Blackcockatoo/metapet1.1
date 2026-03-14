import { afterEach, describe, expect, it, vi } from "vitest";
import { exportPublicKey, generateAddonKeypair, signCanonicalPayload } from "@bluesnake-studios/addon-crypto";

const sessionState = vi.hoisted(() => ({
  records: new Map<string, { sessionId: string; ownerPublicKey: string; status: "active" | "revoked"; issuedAt: string; expiresAt: string; revokedAt?: string }>()
}));

vi.mock("@/lib/server/wallet-session-repository", () => ({
  persistWalletSession: vi.fn(async (record: { sessionId: string; ownerPublicKey: string; status: "active" | "revoked"; issuedAt: string; expiresAt: string; revokedAt?: string }) => {
    sessionState.records.set(record.sessionId, { ...record });
  }),
  getWalletSessionRecord: vi.fn(async (sessionId: string) => sessionState.records.get(sessionId)),
  revokeWalletSessionRecord: vi.fn(async (sessionId: string, revokedAt: string) => {
    const record = sessionState.records.get(sessionId);

    if (!record) {
      return false;
    }

    sessionState.records.set(sessionId, {
      ...record,
      status: "revoked",
      revokedAt
    });
    return true;
  }),
  clearWalletSessionRecords: vi.fn(async () => {
    sessionState.records.clear();
  })
}));

import { issueWalletSessionChallenge, requireWalletSession, verifyWalletSessionChallenge } from "@/lib/server/wallet-auth";

const envKeys = ["WALLET_SESSION_SECRET", "WALLET_SESSION_TTL_MS", "WALLET_CHALLENGE_TTL_MS"] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  sessionState.records.clear();

  for (const key of envKeys) {
    const original = originalEnv[key];

    if (original === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = original;
  }
});

describe("wallet-auth", () => {
  it("issues, verifies, and binds wallet sessions to the owner public key", async () => {
    const keypair = await generateAddonKeypair();
    const ownerPublicKey = await exportPublicKey(keypair.publicKey);

    process.env.WALLET_SESSION_SECRET = "wallet-secret-test";
    process.env.WALLET_SESSION_TTL_MS = "900000";
    process.env.WALLET_CHALLENGE_TTL_MS = "300000";

    const challengeResult = await issueWalletSessionChallenge({ ownerPublicKey });
    const signature = await signCanonicalPayload(challengeResult.challenge, keypair.privateKey);
    const verificationResult = await verifyWalletSessionChallenge({
      challengeToken: challengeResult.challengeToken,
      signature
    });

    expect(verificationResult.session.ownerPublicKey).toBe(ownerPublicKey);

    const session = await requireWalletSession(
      new Request("http://local/api/wallet-transfer/prepare", {
        headers: {
          authorization: `Bearer ${verificationResult.sessionToken}`
        }
      })
    );

    expect(session).toMatchObject({
      kind: "wallet-session",
      ownerPublicKey
    });
    expect(sessionState.records.get(verificationResult.session.sessionId)).toMatchObject({
      status: "active",
      ownerPublicKey
    });
  });

  it("rejects invalid wallet auth signatures", async () => {
    const keypair = await generateAddonKeypair();
    const otherKeypair = await generateAddonKeypair();
    const ownerPublicKey = await exportPublicKey(keypair.publicKey);

    process.env.WALLET_SESSION_SECRET = "wallet-secret-test";

    const challengeResult = await issueWalletSessionChallenge({ ownerPublicKey });
    const invalidSignature = await signCanonicalPayload(challengeResult.challenge, otherKeypair.privateKey);

    await expect(
      verifyWalletSessionChallenge({
        challengeToken: challengeResult.challengeToken,
        signature: invalidSignature
      })
    ).rejects.toMatchObject({
      name: "ApiRouteError",
      status: 401,
      code: "unauthorized"
    });
  });

  it("rejects wallet sessions that are not persisted", async () => {
    const keypair = await generateAddonKeypair();
    const ownerPublicKey = await exportPublicKey(keypair.publicKey);

    process.env.WALLET_SESSION_SECRET = "wallet-secret-test";

    const challengeResult = await issueWalletSessionChallenge({ ownerPublicKey });
    const signature = await signCanonicalPayload(challengeResult.challenge, keypair.privateKey);
    const verificationResult = await verifyWalletSessionChallenge({
      challengeToken: challengeResult.challengeToken,
      signature
    });

    sessionState.records.clear();

    await expect(
      requireWalletSession(
        new Request("http://local/api/wallet-transfer/prepare", {
          headers: {
            authorization: `Bearer ${verificationResult.sessionToken}`
          }
        })
      )
    ).rejects.toMatchObject({
      name: "ApiRouteError",
      status: 401,
      code: "unauthorized"
    });
  });

  it("rejects revoked wallet sessions", async () => {
    const keypair = await generateAddonKeypair();
    const ownerPublicKey = await exportPublicKey(keypair.publicKey);

    process.env.WALLET_SESSION_SECRET = "wallet-secret-test";

    const challengeResult = await issueWalletSessionChallenge({ ownerPublicKey });
    const signature = await signCanonicalPayload(challengeResult.challenge, keypair.privateKey);
    const verificationResult = await verifyWalletSessionChallenge({
      challengeToken: challengeResult.challengeToken,
      signature
    });

    sessionState.records.set(verificationResult.session.sessionId, {
      ...sessionState.records.get(verificationResult.session.sessionId)!,
      status: "revoked",
      revokedAt: new Date().toISOString()
    });

    await expect(
      requireWalletSession(
        new Request("http://local/api/wallet-transfer/prepare", {
          headers: {
            authorization: `Bearer ${verificationResult.sessionToken}`
          }
        })
      )
    ).rejects.toMatchObject({
      name: "ApiRouteError",
      status: 401,
      code: "unauthorized"
    });
  });
});
