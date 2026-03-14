import { exportPublicKey, generateAddonKeypair, signCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const originalTransferConsentPolicy = process.env.TRANSFER_REQUIRE_RECEIVER_CONSENT;
const originalWalletDirectTransferEnabled = process.env.WALLET_DIRECT_TRANSFER_ENABLED;
const originalWalletSessionSecret = process.env.WALLET_SESSION_SECRET;

function expectErrorEnvelope(payload: unknown) {
  expect(payload).toMatchObject({
    code: expect.any(String),
    message: expect.any(String)
  });
}

describe.sequential("API route response contracts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.TRANSFER_REQUIRE_RECEIVER_CONSENT;
    delete process.env.WALLET_DIRECT_TRANSFER_ENABLED;
    delete process.env.WALLET_SESSION_SECRET;
  });

  it("/api/addons GET success/failure schema", async () => {
    vi.doMock("@/lib/server/catalog", () => ({
      getCatalogListing: vi.fn(async (id: string) => (id === "missing" ? null : { id })),
      listCatalogListings: vi.fn(async () => [{ id: "a" }])
    }));

    const route = await import("@/app/api/addons/route");
    const ok = await route.GET(new Request("http://local/api/addons?id=known"));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ listing: { id: "known" } });

    const fail = await route.GET(new Request("http://local/api/addons?id=missing"));
    expect(fail.status).toBe(404);
    expectErrorEnvelope(await fail.json());
  });

  it("/api/inventory GET success/failure schema", async () => {
    vi.doMock("@/lib/server/inventory-repository", () => ({
      loadInventorySnapshot: vi.fn(async () => null),
      saveInventorySnapshot: vi.fn(async () => undefined),
      clearInventorySnapshot: vi.fn(async () => undefined)
    }));

    const route = await import("@/app/api/inventory/route");
    const ok = await route.GET(new Request("http://local/api/inventory?ownerPublicKey=o1"));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ snapshot: null });

    const fail = await route.GET(new Request("http://local/api/inventory"));
    expect(fail.status).toBe(400);
    expectErrorEnvelope(await fail.json());

    const invalidSave = await route.POST(
      new Request("http://local/api/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerPublicKey: "o1", snapshot: { ownerPublicKey: "o1", addons: { broken: {} }, equippedByCategory: {} } })
      })
    );
    expect(invalidSave.status).toBe(400);
    expectErrorEnvelope(await invalidSave.json());
  }, 15_000);

  it("/api/listings GET keeps hidden listings behind admin auth", async () => {
    const resolveOptionalAdminSession = vi.fn((request: Request) => {
      if (request.headers.get("x-admin-token") === "ok") {
        return { actorId: "admin", isAdmin: true };
      }

      return undefined;
    });
    const listStorefrontListings = vi.fn(async ({ includeHidden }: { includeHidden?: boolean }) =>
      includeHidden ? [{ id: "public", visibility: "public" }, { id: "hidden", visibility: "hidden" }] : [{ id: "public", visibility: "public" }]
    );
    const getStorefrontListing = vi.fn(async (listingId: string) => {
      if (listingId === "hidden") {
        return { id: "hidden", visibility: "hidden" };
      }

      return { id: listingId, visibility: "public" };
    });

    vi.doMock("@/lib/server/admin-auth", () => ({
      requireAdminSession: vi.fn(() => ({ actorId: "admin", isAdmin: true })),
      resolveOptionalAdminSession
    }));
    vi.doMock("@/lib/server/listings-repository", () => ({
      listingEnums: { statuses: ["draft", "active", "sold_out"], visibility: ["public", "hidden"] },
      getStorefrontListing,
      listStorefrontListings,
      updateStorefrontListing: vi.fn(async () => ({ id: "l1" }))
    }));

    const route = await import("@/app/api/listings/route");

    const publicList = await route.GET(new Request("http://local/api/listings"));
    expect(publicList.status).toBe(200);
    await expect(publicList.json()).resolves.toMatchObject({ listings: [{ id: "public", visibility: "public" }] });
    expect(listStorefrontListings).toHaveBeenCalledWith({ includeHidden: false });

    const adminList = await route.GET(new Request("http://local/api/listings", { headers: { "x-admin-token": "ok" } }));
    expect(adminList.status).toBe(200);
    await expect(adminList.json()).resolves.toMatchObject({ listings: expect.arrayContaining([{ id: "hidden", visibility: "hidden" }]) });
    expect(listStorefrontListings).toHaveBeenCalledWith({ includeHidden: true });

    const hiddenWithoutAdmin = await route.GET(new Request("http://local/api/listings?id=hidden"));
    expect(hiddenWithoutAdmin.status).toBe(404);
    expectErrorEnvelope(await hiddenWithoutAdmin.json());

    const hiddenWithAdmin = await route.GET(new Request("http://local/api/listings?id=hidden", { headers: { "x-admin-token": "ok" } }));
    expect(hiddenWithAdmin.status).toBe(200);
    await expect(hiddenWithAdmin.json()).resolves.toMatchObject({ listing: { id: "hidden", visibility: "hidden" } });
  }, 15_000);

  it("/api/listings POST success/failure schema", async () => {
    vi.doMock("@/lib/server/admin-auth", () => ({
      requireAdminSession: vi.fn((request: Request) => {
        if (request.headers.get("x-admin-token") !== "ok") {
          throw new Error("Unauthorized admin request.");
        }
        return { actorId: "admin" };
      }),
      resolveOptionalAdminSession: vi.fn(() => undefined)
    }));
    vi.doMock("@/lib/server/listings-repository", () => ({
      listingEnums: { statuses: ["draft", "active", "sold_out"], visibility: ["public", "hidden"] },
      getStorefrontListing: vi.fn(async () => null),
      listStorefrontListings: vi.fn(async () => []),
      updateStorefrontListing: vi.fn(async () => ({ id: "l1" }))
    }));

    const route = await import("@/app/api/listings/route");
    const ok = await route.POST(
      new Request("http://local/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "ok" },
        body: JSON.stringify({ listingId: "l1", priceCents: 100, status: "active", visibility: "public", badge: "new" })
      })
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ listing: { id: "l1" } });

    const fail = await route.POST(new Request("http://local/api/listings", { method: "POST", body: "{}" }));
    expect(fail.status).toBe(401);
    expectErrorEnvelope(await fail.json());
  }, 15_000);

  it("/api/admin/activity GET success/failure schema", async () => {
    const listAuditEvents = vi.fn(async () => [{ id: "audit-1", action: "mint", actorId: "admin", status: "accepted", loggedAt: "2026-01-01T00:00:00.000Z", details: {} }]);
    const listReplayNonceRecords = vi.fn(async () => [{ id: "replay-1", operation: "transfer", scopeKey: "owner-a", nonce: "n1", status: "accepted", attempts: 1, firstSeenAt: "2026-01-01T00:00:00.000Z", lastSeenAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-01-01T01:00:00.000Z" }]);
    const listStorefrontOrders = vi.fn(async () => [{ id: "order-1", listingId: "moss60-aura", addonId: "addon-1", ownerPublicKey: "owner-a", edition: 1, amountCents: 2200, currency: "USD", status: "accepted", custodyMode: "local-dev", signerKeyId: "issuer-key-v3", createdAt: "2026-01-01T00:00:00.000Z" }]);

    vi.doMock("@/lib/server/admin-auth", () => ({
      requireAdminSession: vi.fn((request: Request) => {
        if (request.headers.get("x-admin-token") !== "ok") {
          throw new Error("Unauthorized admin request.");
        }

        return { actorId: "admin", isAdmin: true };
      })
    }));
    vi.doMock("@/lib/server/audit-log", () => ({
      listAuditEvents
    }));
    vi.doMock("@/lib/server/replay-repository", () => ({
      listReplayNonceRecords
    }));
    vi.doMock("@/lib/server/listings-repository", () => ({
      listStorefrontOrders
    }));

    const route = await import("@/app/api/admin/activity/route");
    const ok = await route.GET(
      new Request("http://local/api/admin/activity?limit=5&actorId=admin&auditAction=mint&auditStatus=accepted&scopeKey=owner-a&replayStatus=accepted&orderListingId=moss60-aura&orderOwnerPublicKey=owner-a&search=nonce", {
        headers: { "x-admin-token": "ok" }
      })
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ auditEvents: expect.any(Array), replayNonces: expect.any(Array), orders: expect.any(Array) });
    expect(listAuditEvents).toHaveBeenCalledWith({ limit: 5, actorId: "admin", action: "mint", status: "accepted", search: "nonce" });
    expect(listReplayNonceRecords).toHaveBeenCalledWith({ limit: 5, operation: undefined, scopeKey: "owner-a", status: "accepted", search: "nonce" });
    expect(listStorefrontOrders).toHaveBeenCalledWith({ limit: 5, listingId: "moss60-aura", ownerPublicKey: "owner-a", search: "nonce" });

    const fail = await route.GET(new Request("http://local/api/admin/activity"));
    expect(fail.status).toBe(401);
    expectErrorEnvelope(await fail.json());
  });

  it("/api/mint POST success/failure schema", async () => {
    const recordAuditEvent = vi.fn(async () => undefined);

    vi.doMock("@/lib/server/admin-auth", () => ({ requireAdminSession: vi.fn(() => ({ actorId: "admin" })) }));
    vi.doMock("@/lib/server/audit-log", () => ({ recordAuditEvent }));
    vi.doMock("@/lib/server/mint-service", () => ({
      mintAddonFromRequest: vi.fn(async (body: { ok?: boolean }) =>
        body.ok
          ? { status: 200, body: { addon: { id: "addon-1", proof: { keyId: "issuer-key-v3" } } } }
          : { status: 409, body: { code: "integrity_failed", message: "bad state" } }
      )
    }));

    const route = await import("@/app/api/mint/route");
    const ok = await route.POST(new Request("http://local/api/mint", { method: "POST", body: JSON.stringify({ ok: true }) }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ addon: { id: "addon-1" } });
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ signerKeyId: "issuer-key-v3" })
      })
    );

    const fail = await route.POST(new Request("http://local/api/mint", { method: "POST", body: JSON.stringify({ ok: false }) }));
    expect(fail.status).toBe(409);
    expectErrorEnvelope(await fail.json());
  });

  it("/api/mint POST maps admin auth failures to ADMIN_UNAUTHORIZED", async () => {
    vi.doMock("@/lib/server/admin-auth", () => ({
      requireAdminSession: vi.fn(() => {
        throw new Error("Unauthorized admin request.");
      })
    }));
    vi.doMock("@/lib/server/audit-log", () => ({ recordAuditEvent: vi.fn(async () => undefined) }));

    const route = await import("@/app/api/mint/route");
    const response = await route.POST(new Request("http://local/api/mint", { method: "POST", body: JSON.stringify({}) }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "ADMIN_UNAUTHORIZED", message: expect.any(String) });
  });

  it("/api/purchase POST success/failure schema", async () => {
    vi.doMock("@/lib/server/purchase-service", () => ({
      purchaseListingFromRequest: vi.fn(async (body: { listingId?: string }) =>
        body.listingId ? { status: 200, body: { ok: true } } : { status: 404, body: { code: "not_found", message: "Listing not found." } }
      )
    }));

    const route = await import("@/app/api/purchase/route");
    const ok = await route.POST(new Request("http://local/api/purchase", { method: "POST", body: JSON.stringify({ listingId: "l1" }) }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true });

    const fail = await route.POST(new Request("http://local/api/purchase", { method: "POST", body: JSON.stringify({}) }));
    expect(fail.status).toBe(404);
    expectErrorEnvelope(await fail.json());
  });

  it("/api/transfer POST success/failure schema", async () => {
    vi.doMock("@/lib/server/admin-auth", () => ({ requireAdminSession: vi.fn(() => ({ actorId: "admin", isAdmin: true })) }));
    vi.doMock("@/lib/server/audit-log", () => ({ recordAuditEvent: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/server/transfer-service", () => ({
      transferAddonFromRequest: vi.fn(async (body: { addonId?: string }) =>
        body.addonId ? { status: 200, body: { ok: true } } : { status: 404, body: { code: "not_found", message: "Addon missing." } }
      )
    }));

    const route = await import("@/app/api/transfer/route");
    const ok = await route.POST(new Request("http://local/api/transfer", { method: "POST", body: JSON.stringify({ addonId: "a1" }) }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true });

    const fail = await route.POST(new Request("http://local/api/transfer", { method: "POST", body: JSON.stringify({}) }));
    expect(fail.status).toBe(404);
    expectErrorEnvelope(await fail.json());
  });

  it("/api/transfer POST passes receiver-consent policy when env is true", async () => {
    process.env.TRANSFER_REQUIRE_RECEIVER_CONSENT = "true";

    const transferAddonFromRequest = vi.fn(async () => ({ status: 200, body: { ok: true } }));

    vi.doMock("@/lib/server/admin-auth", () => ({ requireAdminSession: vi.fn(() => ({ actorId: "admin", isAdmin: true })) }));
    vi.doMock("@/lib/server/audit-log", () => ({ recordAuditEvent: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/server/transfer-service", () => ({ transferAddonFromRequest }));

    const route = await import("@/app/api/transfer/route");
    const response = await route.POST(new Request("http://local/api/transfer", { method: "POST", body: JSON.stringify({ addonId: "a1" }) }));

    expect(response.status).toBe(200);
    expect(transferAddonFromRequest).toHaveBeenCalledWith(
      { addonId: "a1" },
      expect.objectContaining({ requireReceiverConsent: true })
    );
  });

  it("/api/transfer POST passes receiver-consent policy when env is false", async () => {
    process.env.TRANSFER_REQUIRE_RECEIVER_CONSENT = "false";

    const transferAddonFromRequest = vi.fn(async () => ({ status: 200, body: { ok: true } }));

    vi.doMock("@/lib/server/admin-auth", () => ({ requireAdminSession: vi.fn(() => ({ actorId: "admin", isAdmin: true })) }));
    vi.doMock("@/lib/server/audit-log", () => ({ recordAuditEvent: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/server/transfer-service", () => ({ transferAddonFromRequest }));

    const route = await import("@/app/api/transfer/route");
    const response = await route.POST(new Request("http://local/api/transfer", { method: "POST", body: JSON.stringify({ addonId: "a1" }) }));

    expect(response.status).toBe(200);
    expect(transferAddonFromRequest).toHaveBeenCalledWith(
      { addonId: "a1" },
      expect.objectContaining({ requireReceiverConsent: false })
    );
  });

  it("/api/transfer POST rejects unsigned and signed payloads without valid admin headers", async () => {
    const transferAddonFromRequest = vi.fn(async () => ({ status: 200, body: { ok: true } }));

    vi.doMock("@/lib/server/admin-auth", () => ({
      requireAdminSession: vi.fn((request: Request) => {
        if (request.headers.get("x-admin-token") !== "ok") {
          throw new Error("Unauthorized admin request.");
        }

        return { actorId: "admin", isAdmin: true };
      })
    }));
    vi.doMock("@/lib/server/audit-log", () => ({ recordAuditEvent: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/server/transfer-service", () => ({ transferAddonFromRequest }));

    const route = await import("@/app/api/transfer/route");

    const unsignedMissingAdmin = await route.POST(
      new Request("http://local/api/transfer", { method: "POST", body: JSON.stringify({ addonId: "a1", fromOwnerPublicKey: "o1", toOwnerPublicKey: "o2" }) })
    );
    expect(unsignedMissingAdmin.status).toBe(401);

    const signedMissingAdmin = await route.POST(
      new Request("http://local/api/transfer", {
        method: "POST",
        body: JSON.stringify({
          addonId: "a1",
          fromOwnerPublicKey: "o1",
          toOwnerPublicKey: "o2",
          nonce: "n1",
          timestampMs: Date.now(),
          ttlMs: 60_000,
          signature: "sig"
        })
      })
    );
    expect(signedMissingAdmin.status).toBe(401);
    expect(transferAddonFromRequest).not.toHaveBeenCalled();
  });

  it("/api/transfer POST accepts signed payload only when admin auth succeeds", async () => {
    const transferAddonFromRequest = vi.fn(async () => ({ status: 200, body: { ok: true } }));

    vi.doMock("@/lib/server/admin-auth", () => ({
      requireAdminSession: vi.fn((request: Request) => {
        if (request.headers.get("x-admin-token") !== "ok") {
          throw new Error("Unauthorized admin request.");
        }

        return { actorId: "admin", isAdmin: true };
      })
    }));
    vi.doMock("@/lib/server/audit-log", () => ({ recordAuditEvent: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/server/transfer-service", () => ({ transferAddonFromRequest }));

    const route = await import("@/app/api/transfer/route");
    const signed = {
      addonId: "a1",
      fromOwnerPublicKey: "o1",
      toOwnerPublicKey: "o2",
      nonce: "n1",
      timestampMs: Date.now(),
      ttlMs: 60_000,
      signature: "sig"
    };

    const unauthorized = await route.POST(new Request("http://local/api/transfer", { method: "POST", body: JSON.stringify(signed) }));
    expect(unauthorized.status).toBe(401);

    const authorized = await route.POST(
      new Request("http://local/api/transfer", {
        method: "POST",
        headers: { "x-admin-token": "ok" },
        body: JSON.stringify(signed)
      })
    );

    expect(authorized.status).toBe(200);
    expect(transferAddonFromRequest).toHaveBeenCalledWith(signed, expect.objectContaining({ isAdmin: true }));
  });

  it("/api/transfer POST maps admin auth failures to ADMIN_UNAUTHORIZED", async () => {
    vi.doMock("@/lib/server/admin-auth", () => ({
      requireAdminSession: vi.fn(() => {
        throw new Error("Unauthorized admin request.");
      })
    }));
    vi.doMock("@/lib/server/audit-log", () => ({ recordAuditEvent: vi.fn(async () => undefined) }));

    const route = await import("@/app/api/transfer/route");
    const response = await route.POST(new Request("http://local/api/transfer", { method: "POST", body: JSON.stringify({}) }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "ADMIN_UNAUTHORIZED", message: expect.any(String) });
  });

  it("/api/wallet-transfer/prepare POST stays disabled behind the feature flag", async () => {
    const route = await import("@/app/api/wallet-transfer/prepare/route");
    const response = await route.POST(
      new Request("http://local/api/wallet-transfer/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addonId: "a1", toOwnerPublicKey: "owner-b" })
      })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "not_found", message: expect.stringContaining("disabled") });
  });

  it("/api/wallet-transfer/submit POST stays disabled behind the feature flag", async () => {
    const route = await import("@/app/api/wallet-transfer/submit/route");
    const response = await route.POST(
      new Request("http://local/api/wallet-transfer/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: "wallet-transfer-1",
          addonId: "a1",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b",
          nonce: "nonce-1",
          timestampMs: 1,
          ttlMs: 300000,
          signature: "sig-1"
        })
      })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "not_found", message: expect.stringContaining("disabled") });
  });

  it("/api/wallet-session challenge and verify POST return the expected contract", async () => {
    process.env.WALLET_SESSION_SECRET = "wallet-secret-test";

    const keypair = await generateAddonKeypair();
    const ownerPublicKey = await exportPublicKey(keypair.publicKey);
    const challengeRoute = await import("@/app/api/wallet-session/challenge/route");
    const challengeResponse = await challengeRoute.POST(
      new Request("http://local/api/wallet-session/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerPublicKey })
      })
    );

    expect(challengeResponse.status).toBe(200);
    const challengePayload = (await challengeResponse.json()) as { challenge: unknown; challengeToken: string };
    expect(challengePayload).toMatchObject({ challenge: expect.any(Object), challengeToken: expect.any(String) });

    const signature = await signCanonicalPayload(challengePayload.challenge, keypair.privateKey);
    const verifyRoute = await import("@/app/api/wallet-session/verify/route");
    const verifyResponse = await verifyRoute.POST(
      new Request("http://local/api/wallet-session/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeToken: challengePayload.challengeToken, signature })
      })
    );

    expect(verifyResponse.status).toBe(200);
    expect(await verifyResponse.json()).toMatchObject({
      session: expect.objectContaining({ ownerPublicKey }),
      sessionToken: expect.any(String)
    });
  });

  it("/api/wallet-session/revoke POST returns the expected contract", async () => {
    const requireWalletSession = vi.fn(async () => ({ sessionId: "wallet-session-1", ownerPublicKey: "owner-a" }));
    const revokeWalletSession = vi.fn(async () => true);

    vi.doMock("@/lib/server/wallet-auth", () => ({
      requireWalletSession,
      revokeWalletSession
    }));

    const route = await import("@/app/api/wallet-session/revoke/route");
    const response = await route.POST(
      new Request("http://local/api/wallet-session/revoke", {
        method: "POST",
        headers: { authorization: "Bearer wallet-session-token" }
      })
    );

    expect(response.status).toBe(200);
    expect(requireWalletSession).toHaveBeenCalled();
    expect(revokeWalletSession).toHaveBeenCalledWith("wallet-session-1");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      revoked: true,
      sessionId: "wallet-session-1"
    });
  });

  it("/api/wallet-transfer/prepare POST binds the wallet session when enabled", async () => {
    process.env.WALLET_DIRECT_TRANSFER_ENABLED = "true";

    const prepareWalletTransferFromRequest = vi.fn(async () => ({
      status: 200,
      body: {
        requestId: "wallet-transfer-1",
        addonId: "a1",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: "owner-b",
        nonce: "nonce-1",
        timestampMs: 1,
        ttlMs: 300000,
        receiverConsentRequired: false
      }
    }));

    vi.doMock("@/lib/server/wallet-auth", () => ({
      requireWalletSession: vi.fn(() => ({ sessionId: "wallet-session-1", ownerPublicKey: "owner-a" }))
    }));
    vi.doMock("@/lib/server/wallet-transfer-service", () => ({ prepareWalletTransferFromRequest }));

    const route = await import("@/app/api/wallet-transfer/prepare/route");
    const response = await route.POST(
      new Request("http://local/api/wallet-transfer/prepare", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer wallet-session-token" },
        body: JSON.stringify({ addonId: "a1", toOwnerPublicKey: "owner-b" })
      })
    );

    expect(response.status).toBe(200);
    expect(prepareWalletTransferFromRequest).toHaveBeenCalledWith(
      { addonId: "a1", toOwnerPublicKey: "owner-b" },
      expect.objectContaining({ sessionId: "wallet-session-1", sessionOwnerPublicKey: "owner-a" })
    );
  });

  it("/api/wallet-transfer/submit POST binds the wallet session and records audit when enabled", async () => {
    process.env.WALLET_DIRECT_TRANSFER_ENABLED = "true";

    const submitWalletTransferFromRequest = vi.fn(async () => ({
      status: 200,
      body: {
        ok: true,
        requestId: "wallet-transfer-1",
        addonId: "a1",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: "owner-b",
        nonce: "nonce-1",
        timestampMs: 1,
        ttlMs: 300000
      }
    }));
    const recordAuditEvent = vi.fn(async () => undefined);

    vi.doMock("@/lib/server/wallet-auth", () => ({
      requireWalletSession: vi.fn(() => ({ sessionId: "wallet-session-1", ownerPublicKey: "owner-a" }))
    }));
    vi.doMock("@/lib/server/wallet-transfer-service", () => ({ submitWalletTransferFromRequest }));
    vi.doMock("@/lib/server/audit-log", () => ({ recordAuditEvent }));

    const route = await import("@/app/api/wallet-transfer/submit/route");
    const response = await route.POST(
      new Request("http://local/api/wallet-transfer/submit", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer wallet-session-token" },
        body: JSON.stringify({
          requestId: "wallet-transfer-1",
          addonId: "a1",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b",
          nonce: "nonce-1",
          timestampMs: 1,
          ttlMs: 300000,
          signature: "sig-1"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(submitWalletTransferFromRequest).toHaveBeenCalledWith(
      {
        requestId: "wallet-transfer-1",
        addonId: "a1",
        fromOwnerPublicKey: "owner-a",
        toOwnerPublicKey: "owner-b",
        nonce: "nonce-1",
        timestampMs: 1,
        ttlMs: 300000,
        signature: "sig-1"
      },
      expect.objectContaining({ sessionId: "wallet-session-1", sessionOwnerPublicKey: "owner-a" })
    );
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "transfer",
        actorId: "wallet:owner-a",
        status: "accepted",
        details: expect.objectContaining({ channel: "wallet", sessionId: "wallet-session-1" })
      })
    );
  });

  it("/api/verify POST success/failure schema", async () => {
    vi.doMock("@/lib/server/verify-service", () => ({
      verifyAddonFromRequest: vi.fn(async (body: { valid?: boolean }) =>
        body.valid ? { status: 200, body: { verified: true } } : { status: 422, body: { code: "integrity_failed", message: "invalid signature" } }
      )
    }));

    const route = await import("@/app/api/verify/route");
    const ok = await route.POST(new Request("http://local/api/verify", { method: "POST", body: JSON.stringify({ valid: true }) }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ verified: true });

    const fail = await route.POST(new Request("http://local/api/verify", { method: "POST", body: JSON.stringify({}) }));
    expect(fail.status).toBe(422);
    expectErrorEnvelope(await fail.json());
  });

  it("/api/moss60/share POST success/failure schema", async () => {
    vi.doMock("@/lib/server/moss60-service", () => ({
      createShareUrlFromRequest: vi.fn(async (body: { addon?: unknown }) =>
        body.addon ? { status: 200, body: { shareUrl: "https://example.test", payload: { ok: true } } } : { status: 400, body: { code: "validation_failed", message: "addon is required" } }
      )
    }));

    const route = await import("@/app/api/moss60/share/route");
    const ok = await route.POST(new Request("http://local/api/moss60/share", { method: "POST", body: JSON.stringify({ addon: {} }) }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ shareUrl: expect.any(String) });

    const fail = await route.POST(new Request("http://local/api/moss60/share", { method: "POST", body: JSON.stringify({}) }));
    expect(fail.status).toBe(400);
    expectErrorEnvelope(await fail.json());
  });

  afterAll(() => {
    if (originalTransferConsentPolicy === undefined) {
      delete process.env.TRANSFER_REQUIRE_RECEIVER_CONSENT;
    } else {
      process.env.TRANSFER_REQUIRE_RECEIVER_CONSENT = originalTransferConsentPolicy;
    }

    if (originalWalletDirectTransferEnabled === undefined) {
      delete process.env.WALLET_DIRECT_TRANSFER_ENABLED;
    } else {
      process.env.WALLET_DIRECT_TRANSFER_ENABLED = originalWalletDirectTransferEnabled;
    }

    if (originalWalletSessionSecret === undefined) {
      delete process.env.WALLET_SESSION_SECRET;
      return;
    }

    process.env.WALLET_SESSION_SECRET = originalWalletSessionSecret;
  });
});
