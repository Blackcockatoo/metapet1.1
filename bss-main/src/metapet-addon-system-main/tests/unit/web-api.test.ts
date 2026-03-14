import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientApiError } from "@/lib/client/api-error";
import {
  issueWalletSessionChallenge,
  listAdminActivity,
  mintAddon,
  prepareWalletTransfer,
  purchaseListing,
  revokeWalletSession,
  submitWalletTransfer,
  transferAddon,
  updateListing,
  verifyWalletSession
} from "@/lib/client/web-api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("web-api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends admin headers for privileged actions", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ addon: { id: "addon-1" }, custodyMode: "local-dev" }));
    vi.stubGlobal("fetch", fetchMock);

    await mintAddon(
      {
        templateId: "moss60-aura",
        addonId: "addon-1",
        edition: 1,
        ownerPublicKey: "owner-a",
        metadata: { title: "Aura", description: "fixture", traits: {} }
      },
      { adminToken: "token-1", adminActor: "admin-console" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mint",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-admin-token": "token-1",
          "x-admin-actor": "admin-console"
        })
      })
    );
  });

  it("sends receiver consent in the transfer payload when provided", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, addonId: "addon-4", fromOwnerPublicKey: "owner-a", toOwnerPublicKey: "owner-b" }));
    vi.stubGlobal("fetch", fetchMock);

    await transferAddon(
      {
        addonId: "addon-4",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: "owner-b",
        receiverConsent: {
          requestId: "transfer-request-1",
          addonId: "addon-4",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b",
          receiverPublicKey: "owner-b",
          issuedAt: "2026-03-11T00:00:00.000Z",
          expiresAt: "2026-03-11T00:05:00.000Z",
          acceptedAt: "2026-03-11T00:00:00.000Z",
          signature: "receiver-sig-1"
        }
      },
      { adminToken: "token-4", adminActor: "inventory-console" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transfer",
      expect.objectContaining({
        body: JSON.stringify({
          addonId: "addon-4",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b",
          receiverConsent: {
            requestId: "transfer-request-1",
            addonId: "addon-4",
            fromOwnerPublicKey: "owner-a",
            toOwnerPublicKey: "owner-b",
            receiverPublicKey: "owner-b",
            issuedAt: "2026-03-11T00:00:00.000Z",
            expiresAt: "2026-03-11T00:05:00.000Z",
            acceptedAt: "2026-03-11T00:00:00.000Z",
            signature: "receiver-sig-1"
          }
        })
      })
    );
  });

  it("parses successful storefront responses with typed shapes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true, addon: { id: "addon-2" }, order: { id: "order-1" }, listing: { id: "listing-1" } }))
    );

    const payload = await purchaseListing({ listingId: "listing-1", ownerPublicKey: "owner-a" });

    expect(payload).toMatchObject({
      ok: true,
      addon: { id: "addon-2" },
      order: { id: "order-1" },
      listing: { id: "listing-1" }
    });
  });

  it("throws ClientApiError for failed requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code: "ADMIN_UNAUTHORIZED", message: "Unauthorized admin request." }, 401))
    );

    await expect(
      transferAddon(
        {
          addonId: "addon-3",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b"
        },
        { adminToken: "bad-token", adminActor: "inventory-console" }
      )
    ).rejects.toEqual(expect.any(ClientApiError));
  });

  it("posts listing updates with the shared request helper", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ listing: { id: "listing-1", name: "Aura" } }));
    vi.stubGlobal("fetch", fetchMock);

    await updateListing(
      {
        listingId: "listing-1",
        priceCents: 1500,
        status: "active",
        visibility: "public",
        badge: "rare"
      },
      { adminToken: "token-2", adminActor: "catalog-admin" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/listings",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("posts wallet session and transfer contracts to their dedicated routes", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () =>
        jsonResponse({
          challenge: {
            kind: "wallet-auth-challenge",
            challengeId: "challenge-1",
            ownerPublicKey: "owner-a",
            issuedAt: "2026-03-13T00:00:00.000Z",
            expiresAt: "2026-03-13T00:05:00.000Z"
          },
          challengeToken: "challenge-token-1"
        })
      )
      .mockImplementationOnce(async () =>
        jsonResponse({
          session: {
            kind: "wallet-session",
            sessionId: "wallet-session-1",
            ownerPublicKey: "owner-a",
            issuedAt: "2026-03-13T00:00:00.000Z",
            expiresAt: "2026-03-13T00:15:00.000Z"
          },
          sessionToken: "wallet-session-token-1"
        })
      )
      .mockImplementationOnce(async () =>
        jsonResponse({
          ok: true,
          revoked: true,
          sessionId: "wallet-session-1"
        })
      )
      .mockImplementationOnce(async () =>
        jsonResponse({
          requestId: "wallet-transfer-1",
          addonId: "addon-5",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b",
          nonce: "nonce-5",
          timestampMs: 1,
          ttlMs: 300000,
          receiverConsentRequired: false
        })
      )
      .mockImplementationOnce(async () =>
        jsonResponse({
          ok: true,
          requestId: "wallet-transfer-1",
          addonId: "addon-5",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b",
          nonce: "nonce-5",
          timestampMs: 1,
          ttlMs: 300000
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await issueWalletSessionChallenge({ ownerPublicKey: "owner-a" });
    await verifyWalletSession({ challengeToken: "challenge-token-1", signature: "wallet-signature-1" });
    await revokeWalletSession({ sessionToken: "wallet-session-token-1" });
    await prepareWalletTransfer(
      {
        addonId: "addon-5",
        toOwnerPublicKey: "owner-b",
        receiverConsentRequested: true
      },
      { sessionToken: "wallet-session-token-1" }
    );
    await submitWalletTransfer(
      {
        requestId: "wallet-transfer-1",
        addonId: "addon-5",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: "owner-b",
        nonce: "nonce-5",
        timestampMs: 1,
        ttlMs: 300000,
        signature: "sig-5"
      },
      { sessionToken: "wallet-session-token-1" }
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/wallet-session/challenge",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ownerPublicKey: "owner-a" })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/wallet-session/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ challengeToken: "challenge-token-1", signature: "wallet-signature-1" })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/wallet-session/revoke",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer wallet-session-token-1" })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/wallet-transfer/prepare",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer wallet-session-token-1" }),
        body: JSON.stringify({
          addonId: "addon-5",
          toOwnerPublicKey: "owner-b",
          receiverConsentRequested: true
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/wallet-transfer/submit",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer wallet-session-token-1" }),
        body: JSON.stringify({
          requestId: "wallet-transfer-1",
          addonId: "addon-5",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b",
          nonce: "nonce-5",
          timestampMs: 1,
          ttlMs: 300000,
          signature: "sig-5"
        })
      })
    );
  });

  it("encodes admin activity filters into query params", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ auditEvents: [], replayNonces: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await listAdminActivity(
      { adminToken: "token-3", adminActor: "admin-audit" },
      {
        limit: 50,
        actorId: "inventory-console",
        auditAction: "transfer",
        auditStatus: "rejected",
        orderListingId: "moss60-aura",
        orderOwnerPublicKey: "owner-a",
        replayStatus: "replayed",
        scopeKey: "owner-a",
        search: "nonce-1"
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/activity?limit=50&actorId=inventory-console&auditAction=transfer&auditStatus=rejected&replayStatus=replayed&orderListingId=moss60-aura&orderOwnerPublicKey=owner-a&scopeKey=owner-a&search=nonce-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-admin-token": "token-3"
        })
      })
    );
  });
});
