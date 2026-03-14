import { exportPublicKey, generateAddonKeypair, signCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toReceiverAttestationPayload } from "@/lib/shared/receiver-attestation";

const replayState = vi.hoisted(() => ({
  records: new Map<string, { status: "accepted" | "replayed" | "expired"; seenAt: string; attempts: number; expiresAt: string }>()
}));

vi.mock("@/lib/server/inventory-repository", () => ({
  transferOwnedAddon: vi.fn()
}));

vi.mock("@/lib/server/app-database-adapter", () => ({
  getAppDatabaseAdapter: vi.fn(() => ({
    clearReplayNonces: vi.fn(async () => {
      replayState.records.clear();
    }),
    queryReplayNonces: vi.fn(async () => []),
    upsertReplayNonce: vi.fn(async (input: { operation: string; scopeKey: string; nonce: string; status: "accepted" | "replayed" | "expired"; seenAt: string; expiresAt: string }) => {
      const key = `${input.operation}:${input.scopeKey}:${input.nonce}`;
      const existing = replayState.records.get(key);

      if (existing) {
        replayState.records.set(key, {
          ...existing,
          attempts: existing.attempts + 1,
          seenAt: input.seenAt,
          status: "replayed"
        });
        return "replayed" as const;
      }

      replayState.records.set(key, {
        status: input.status,
        seenAt: input.seenAt,
        attempts: 1,
        expiresAt: input.expiresAt
      });
        return input.status;
    })
  })),
  runAppDatabaseTransaction: vi.fn(async (work: (transaction: unknown) => Promise<unknown>) =>
    work({
      loadInventorySnapshot: vi.fn(async () => undefined),
      saveInventorySnapshot: vi.fn(async () => undefined),
      clearInventorySnapshot: vi.fn(async () => undefined),
      getStorefrontListing: vi.fn(async () => undefined),
      upsertStorefrontListing: vi.fn(async () => undefined),
      insertStorefrontOrder: vi.fn(async () => undefined),
      upsertReplayNonce: async (input: { operation: string; scopeKey: string; nonce: string; status: "accepted" | "replayed" | "expired"; seenAt: string; expiresAt: string }) => {
        const key = `${input.operation}:${input.scopeKey}:${input.nonce}`;
        const existing = replayState.records.get(key);

        if (existing) {
          replayState.records.set(key, {
            ...existing,
            attempts: existing.attempts + 1,
            seenAt: input.seenAt,
            status: "replayed"
          });
          return "replayed" as const;
        }

        replayState.records.set(key, {
          status: input.status,
          seenAt: input.seenAt,
          attempts: 1,
          expiresAt: input.expiresAt
        });

        return input.status;
      }
    })
  )
}));

import { transferOwnedAddon } from "@/lib/server/inventory-repository";
import { TRANSFER_ERROR_CODES, transferAddonFromRequest } from "@/lib/server/transfer-service";

async function buildSignedTransferRequest(overrides: Partial<Record<string, unknown>> = {}) {
  const source = await generateAddonKeypair();
  const destination = await generateAddonKeypair();
  const fromOwnerPublicKey = await exportPublicKey(source.publicKey);
  const toOwnerPublicKey = await exportPublicKey(destination.publicKey);

  const payload = {
    addonId: "addon-001",
    fromOwnerPublicKey,
    toOwnerPublicKey,
    nonce: "nonce-001",
    timestampMs: Date.now(),
    ttlMs: 60_000,
    ...(overrides as object)
  };

  const signature = await signCanonicalPayload(
    {
      addonId: payload.addonId,
      fromOwnerPublicKey: payload.fromOwnerPublicKey,
      toOwnerPublicKey: payload.toOwnerPublicKey,
      nonce: payload.nonce,
      timestampMs: payload.timestampMs,
      ttlMs: payload.ttlMs
    },
    source.privateKey
  );

  return {
    ...payload,
    signature,
    destinationPrivateKey: destination.privateKey
  };
}

async function buildReceiverAttestation(
  input: {
    addonId: string;
    fromOwnerPublicKey: string;
    toOwnerPublicKey: string;
    issuedAt: string;
    expiresAt: string;
  },
  receiverPrivateKey: CryptoKey,
  overrides: Partial<Record<string, string>> = {}
) {
  const attestation = {
    requestId: overrides.requestId ?? `receiver-request-${crypto.randomUUID()}`,
    addonId: overrides.addonId ?? input.addonId,
    fromOwnerPublicKey: overrides.fromOwnerPublicKey ?? input.fromOwnerPublicKey,
    toOwnerPublicKey: overrides.toOwnerPublicKey ?? input.toOwnerPublicKey,
    receiverPublicKey: overrides.receiverPublicKey ?? input.toOwnerPublicKey,
    issuedAt: overrides.issuedAt ?? input.issuedAt,
    expiresAt: overrides.expiresAt ?? input.expiresAt,
    acceptedAt: overrides.acceptedAt ?? new Date().toISOString(),
    signature: ""
  };

  const signature = await signCanonicalPayload(toReceiverAttestationPayload(attestation), receiverPrivateKey);

  return {
    ...attestation,
    signature
  };
}

describe("transfer-service", () => {
  beforeEach(() => {
    vi.mocked(transferOwnedAddon).mockReset();
    replayState.records.clear();
    delete process.env.TRANSFER_REVOKED_RECEIVER_CONSENT_IDS_JSON;
  });

  it("rejects unauthorized callers", async () => {
    const request = await buildSignedTransferRequest();

    const result = await transferAddonFromRequest(request, { requesterId: "operator" });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      errorCode: TRANSFER_ERROR_CODES.unauthorizedRequester
    });
    expect(transferOwnedAddon).not.toHaveBeenCalled();
  });

  it("allows authenticated admin sessions regardless of actor label", async () => {
    const request = await buildSignedTransferRequest({ nonce: "nonce-admin-session" });
    vi.mocked(transferOwnedAddon).mockResolvedValue(true);

    const result = await transferAddonFromRequest(request, {
      requesterId: "inventory-console",
      isAdmin: true
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      addonId: request.addonId
    });
  });

  it("rejects transfers when receiver consent is required but missing", async () => {
    vi.mocked(transferOwnedAddon).mockResolvedValue(true);

    const result = await transferAddonFromRequest(
      {
        addonId: "addon-unsigned",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: "owner-b"
      },
      {
        requesterId: "inventory-console",
        isAdmin: true,
        requireReceiverConsent: true
      }
    );

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      errorCode: TRANSFER_ERROR_CODES.receiverConsentRequired
    });
    expect(transferOwnedAddon).not.toHaveBeenCalled();
  });

  it("rejects transfers when receiver attestation does not match destination owner", async () => {
    const receiver = await generateAddonKeypair();
    const validReceiverPublicKey = await exportPublicKey(receiver.publicKey);
    vi.mocked(transferOwnedAddon).mockResolvedValue(true);

    const result = await transferAddonFromRequest(
      {
        addonId: "addon-unsigned",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: "owner-b",
        receiverConsent: await buildReceiverAttestation(
          {
            addonId: "addon-unsigned",
            fromOwnerPublicKey: "owner-a",
            toOwnerPublicKey: validReceiverPublicKey,
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          },
          receiver.privateKey,
          { receiverPublicKey: "owner-c" }
        )
      },
      {
        requesterId: "inventory-console",
        isAdmin: true,
        requireReceiverConsent: true
      }
    );

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      errorCode: TRANSFER_ERROR_CODES.invalidReceiverConsent
    });
    expect(transferOwnedAddon).not.toHaveBeenCalled();
  });

  it("rejects revoked receiver attestations", async () => {
    const receiver = await generateAddonKeypair();
    const receiverPublicKey = await exportPublicKey(receiver.publicKey);
    const attestation = await buildReceiverAttestation(
      {
        addonId: "addon-unsigned",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: receiverPublicKey,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      },
      receiver.privateKey,
      { requestId: "revoked-request-1" }
    );
    process.env.TRANSFER_REVOKED_RECEIVER_CONSENT_IDS_JSON = JSON.stringify(["revoked-request-1"]);

    const result = await transferAddonFromRequest(
      {
        addonId: "addon-unsigned",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: receiverPublicKey,
        receiverConsent: attestation
      },
      {
        requesterId: "inventory-console",
        isAdmin: true,
        requireReceiverConsent: true
      }
    );

    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({
      errorCode: TRANSFER_ERROR_CODES.revokedReceiverConsent
    });
  });

  it("allows transfers when receiver attestation matches destination owner", async () => {
    const receiver = await generateAddonKeypair();
    const receiverPublicKey = await exportPublicKey(receiver.publicKey);
    vi.mocked(transferOwnedAddon).mockResolvedValue(true);

    const result = await transferAddonFromRequest(
      {
        addonId: "addon-unsigned",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: receiverPublicKey,
        receiverConsent: await buildReceiverAttestation(
          {
            addonId: "addon-unsigned",
            fromOwnerPublicKey: "owner-a",
            toOwnerPublicKey: receiverPublicKey,
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          },
          receiver.privateKey
        )
      },
      {
        requesterId: "inventory-console",
        isAdmin: true,
        requireReceiverConsent: true
      }
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      addonId: "addon-unsigned"
    });
    expect(transferOwnedAddon).toHaveBeenCalledWith("addon-unsigned", "owner-a", receiverPublicKey, expect.any(Object));
  });

  it("rejects invalid signatures", async () => {
    const request = await buildSignedTransferRequest();
    vi.mocked(transferOwnedAddon).mockResolvedValue(true);

    const result = await transferAddonFromRequest(
      {
        ...request,
        signature: "not-a-valid-signature"
      },
      { requesterId: "admin", isAdmin: true }
    );

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      errorCode: TRANSFER_ERROR_CODES.invalidSignature
    });
    expect(transferOwnedAddon).not.toHaveBeenCalled();
  });

  it("rejects replayed and expired requests", async () => {
    const request = await buildSignedTransferRequest();
    vi.mocked(transferOwnedAddon).mockResolvedValue(true);

    const first = await transferAddonFromRequest(request, { requesterId: "admin", isAdmin: true });
    const replay = await transferAddonFromRequest(request, { requesterId: "admin", isAdmin: true });

    expect(first.status).toBe(200);
    expect(replay.status).toBe(409);
    expect(replay.body).toMatchObject({
      errorCode: TRANSFER_ERROR_CODES.replayedRequest
    });

    replayState.records.clear();
    const expired = await buildSignedTransferRequest({
      nonce: "nonce-expired",
      timestampMs: Date.now() - 2_000,
      ttlMs: 1_000
    });

    const expiredResult = await transferAddonFromRequest(expired, { requesterId: "admin", isAdmin: true });

    expect(expiredResult.status).toBe(409);
    expect(expiredResult.body).toMatchObject({
      errorCode: TRANSFER_ERROR_CODES.expiredRequest
    });
  });

  it("transfers successfully for valid signed requests with receiver attestation", async () => {
    const request = await buildSignedTransferRequest({ nonce: "nonce-success" });
    vi.mocked(transferOwnedAddon).mockResolvedValue(true);

    const result = await transferAddonFromRequest(
      {
        ...request,
        receiverConsent: await buildReceiverAttestation(
          {
            addonId: request.addonId,
            fromOwnerPublicKey: request.fromOwnerPublicKey,
            toOwnerPublicKey: request.toOwnerPublicKey,
            issuedAt: new Date(request.timestampMs).toISOString(),
            expiresAt: new Date(request.timestampMs + request.ttlMs).toISOString()
          },
          request.destinationPrivateKey
        )
      },
      { requesterId: "admin", isAdmin: true, requireReceiverConsent: true }
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      addonId: request.addonId,
      nonce: request.nonce
    });
    expect(transferOwnedAddon).toHaveBeenCalledWith(
      request.addonId,
      request.fromOwnerPublicKey,
      request.toOwnerPublicKey,
      expect.any(Object)
    );
  });
});
