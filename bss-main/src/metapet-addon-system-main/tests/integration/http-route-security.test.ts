import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { exportPublicKey, generateAddonKeypair, signCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envKeys = [
  "APP_DATABASE_PATH",
  "ADMIN_API_TOKEN",
  "ADDON_CUSTODY_PROVIDER",
  "ADDON_MANAGED_SIGNER_ENDPOINT",
  "ADDON_MANAGED_SIGNER_KEY_ID",
  "ADDON_MANAGED_ISSUER_PUBLIC_KEY",
  "ADDON_MANAGED_SIGNER_AUTH_MECHANISM",
  "ADDON_MANAGED_SIGNER_AUTH_TOKEN",
  "WALLET_SESSION_SECRET",
  "WALLET_DIRECT_TRANSFER_ENABLED"
] as const;

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

describe.sequential("HTTP route security and failure coverage", () => {
  let databasePath = "";

  beforeEach(async () => {
    databasePath = await mkdtemp(join(tmpdir(), "metapet-http-routes-"));
    process.env.APP_DATABASE_PATH = databasePath;
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(async () => {
    const { disposeAppDatabaseAdapterForTests } = await import("@/lib/server/app-database-adapter");

    await disposeAppDatabaseAdapterForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    for (const key of envKeys) {
      const original = originalEnv[key];

      if (original === undefined) {
        delete process.env[key];
        continue;
      }

      process.env[key] = original;
    }

    if (databasePath) {
      await rm(databasePath, { recursive: true, force: true });
    }
  });

  it("surfaces managed signer upstream HTTP failures through /api/mint", async () => {
    const issuerKeypair = await generateAddonKeypair();

    process.env.ADMIN_API_TOKEN = "admin-fixed-token";
    process.env.ADDON_CUSTODY_PROVIDER = "managed";
    process.env.ADDON_MANAGED_SIGNER_ENDPOINT = "https://signer.example.test/sign";
    process.env.ADDON_MANAGED_SIGNER_KEY_ID = "issuer-key-v1";
    process.env.ADDON_MANAGED_ISSUER_PUBLIC_KEY = await exportPublicKey(issuerKeypair.publicKey);
    process.env.ADDON_MANAGED_SIGNER_AUTH_MECHANISM = "none";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "upstream unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" }
        })
      )
    );

    const mintRoute = await import("@/app/api/mint/route");
    const response = await mintRoute.POST(
      new Request("http://localhost/api/mint", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": "admin-fixed-token"
        },
        body: JSON.stringify({
          templateId: "moss60-aura",
          addonId: "managed-http-failure",
          edition: 1,
          ownerPublicKey: "owner-a",
          metadata: { title: "Aura", description: "managed", traits: {} }
        })
      })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: "SIGNER_REQUEST_FAILED",
      custodyMode: "managed"
    });
  });

  it("surfaces managed signer bad-response failures through /api/mint", async () => {
    const issuerKeypair = await generateAddonKeypair();
    const issuerPublicKey = await exportPublicKey(issuerKeypair.publicKey);

    process.env.ADMIN_API_TOKEN = "admin-fixed-token";
    process.env.ADDON_CUSTODY_PROVIDER = "managed";
    process.env.ADDON_MANAGED_SIGNER_ENDPOINT = "https://signer.example.test/sign";
    process.env.ADDON_MANAGED_SIGNER_KEY_ID = "issuer-key-v1";
    process.env.ADDON_MANAGED_ISSUER_PUBLIC_KEY = issuerPublicKey;
    process.env.ADDON_MANAGED_SIGNER_AUTH_MECHANISM = "none";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ keyId: "issuer-key-v1", publicKey: issuerPublicKey }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    );

    const mintRoute = await import("@/app/api/mint/route");
    const response = await mintRoute.POST(
      new Request("http://localhost/api/mint", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": "admin-fixed-token"
        },
        body: JSON.stringify({
          templateId: "moss60-aura",
          addonId: "managed-bad-response",
          edition: 1,
          ownerPublicKey: "owner-a",
          metadata: { title: "Aura", description: "managed", traits: {} }
        })
      })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: "SIGNER_BAD_RESPONSE",
      custodyMode: "managed"
    });
  });

  it("revokes wallet sessions through HTTP routes and blocks subsequent wallet-route access", async () => {
    process.env.WALLET_SESSION_SECRET = "wallet-secret-test";
    process.env.WALLET_DIRECT_TRANSFER_ENABLED = "true";

    const ownerKeypair = await generateAddonKeypair();
    const ownerPublicKey = await exportPublicKey(ownerKeypair.publicKey);
    const challengeRoute = await import("@/app/api/wallet-session/challenge/route");
    const verifyRoute = await import("@/app/api/wallet-session/verify/route");
    const revokeRoute = await import("@/app/api/wallet-session/revoke/route");
    const prepareRoute = await import("@/app/api/wallet-transfer/prepare/route");

    const challengeResponse = await challengeRoute.POST(
      new Request("http://localhost/api/wallet-session/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerPublicKey })
      })
    );
    const challengePayload = (await challengeResponse.json()) as { challenge: unknown; challengeToken: string };
    const signature = await signCanonicalPayload(challengePayload.challenge, ownerKeypair.privateKey);

    const verifyResponse = await verifyRoute.POST(
      new Request("http://localhost/api/wallet-session/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeToken: challengePayload.challengeToken, signature })
      })
    );
    const verifyPayload = (await verifyResponse.json()) as { sessionToken: string; session: { sessionId: string } };

    const revokeResponse = await revokeRoute.POST(
      new Request("http://localhost/api/wallet-session/revoke", {
        method: "POST",
        headers: {
          authorization: `Bearer ${verifyPayload.sessionToken}`
        }
      })
    );

    expect(revokeResponse.status).toBe(200);
    await expect(revokeResponse.json()).resolves.toMatchObject({
      ok: true,
      revoked: true,
      sessionId: verifyPayload.session.sessionId
    });

    const prepareResponse = await prepareRoute.POST(
      new Request("http://localhost/api/wallet-transfer/prepare", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${verifyPayload.sessionToken}`
        },
        body: JSON.stringify({ addonId: "addon-1", toOwnerPublicKey: "owner-b" })
      })
    );

    expect(prepareResponse.status).toBe(401);
    await expect(prepareResponse.json()).resolves.toMatchObject({
      code: "unauthorized"
    });
  });
});
