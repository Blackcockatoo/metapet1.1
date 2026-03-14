import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { exportPrivateKey, exportPublicKey, generateAddonKeypair, signCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeDirectoryWithRetry(targetPath: string, maxAttempts = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String(error.code) : undefined;

      if ((code !== "EBUSY" && code !== "EPERM") || attempt === maxAttempts) {
        throw error;
      }

      await sleep(attempt * 250);
    }
  }
}

async function getOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Could not allocate an open TCP port."));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

describe.sequential("Postgres-backed persistence", () => {
  let databaseDir = "";
  let databasePort = 0;
  let databaseName = "";
  let connectionString = "";
  let embeddedPostgres:
    | {
        initialise(): Promise<void>;
        start(): Promise<void>;
        stop(): Promise<void>;
        createDatabase(name: string): Promise<void>;
        dropDatabase(name: string): Promise<void>;
      }
    | undefined;

  const originalEnv = {
    APP_DATABASE_BACKEND: process.env.APP_DATABASE_BACKEND,
    APP_DATABASE_URL: process.env.APP_DATABASE_URL,
    ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN,
    ADDON_CUSTODY_PROVIDER: process.env.ADDON_CUSTODY_PROVIDER,
    ADDON_ISSUER_PUBLIC_KEY: process.env.ADDON_ISSUER_PUBLIC_KEY,
    ADDON_ISSUER_PRIVATE_KEY: process.env.ADDON_ISSUER_PRIVATE_KEY
  };

  beforeAll(async () => {
    const { default: EmbeddedPostgres } = await import("embedded-postgres");

    databaseDir = await mkdtemp(join(tmpdir(), "metapet-embedded-postgres-"));
    databasePort = await getOpenPort();
    embeddedPostgres = new EmbeddedPostgres({
      databaseDir,
      port: databasePort,
      user: "postgres",
      password: "password",
      persistent: false,
      onLog: () => undefined,
      onError: () => undefined
    });

    await embeddedPostgres.initialise();
    await embeddedPostgres.start();
  }, 120_000);

  beforeEach(async () => {
    databaseName = `metapet_${crypto.randomUUID().replace(/-/g, "")}`;
    connectionString = `postgres://postgres:password@127.0.0.1:${databasePort}/${databaseName}`;

    await embeddedPostgres?.createDatabase(databaseName);

    const issuerKeypair = await generateAddonKeypair();
    process.env.APP_DATABASE_BACKEND = "postgres";
    process.env.APP_DATABASE_URL = connectionString;
    process.env.ADMIN_API_TOKEN = "admin-fixed-token";
    process.env.ADDON_CUSTODY_PROVIDER = "local-dev";
    process.env.ADDON_ISSUER_PUBLIC_KEY = await exportPublicKey(issuerKeypair.publicKey);
    process.env.ADDON_ISSUER_PRIVATE_KEY = await exportPrivateKey(issuerKeypair.privateKey);

    vi.resetModules();
  }, 120_000);

  afterEach(async () => {
    const { disposeAppDatabaseAdapterForTests } = await import("@/lib/server/app-database-adapter");

    await disposeAppDatabaseAdapterForTests();

    if (databaseName) {
      await embeddedPostgres?.dropDatabase(databaseName).catch(() => undefined);
    }
  }, 120_000);

  afterAll(async () => {
    await embeddedPostgres?.stop();
    embeddedPostgres = undefined;
    await removeDirectoryWithRetry(databaseDir);

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
        continue;
      }

      process.env[key] = value;
    }
  }, 120_000);

  it("supports purchase and signed transfer routes end-to-end on Postgres", async () => {
    const ownerKeypair = await generateAddonKeypair();
    const receiverKeypair = await generateAddonKeypair();
    const ownerPublicKey = await exportPublicKey(ownerKeypair.publicKey);
    const receiverPublicKey = await exportPublicKey(receiverKeypair.publicKey);

    const purchaseRoute = await import("@/app/api/purchase/route");
    const transferRoute = await import("@/app/api/transfer/route");
    const inventoryRoute = await import("@/app/api/inventory/route");
    const activityRoute = await import("@/app/api/admin/activity/route");

    const purchaseResponse = await purchaseRoute.POST(
      new Request("http://localhost/api/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: "moss60-aura",
          ownerPublicKey
        })
      })
    );

    expect(purchaseResponse.status).toBe(200);
    const purchasePayload = (await purchaseResponse.json()) as {
      order: { listingId: string };
      addon: { id: string };
      listing: { soldCount: number };
    };

    expect(purchasePayload.order.listingId).toBe("moss60-aura");
    expect(purchasePayload.listing.soldCount).toBe(1);

    const ownerInventoryBefore = await inventoryRoute.GET(
      new Request(`http://localhost/api/inventory?ownerPublicKey=${encodeURIComponent(ownerPublicKey)}`)
    );

    await expect(ownerInventoryBefore.json()).resolves.toMatchObject({
      snapshot: {
        ownerPublicKey,
        addons: {
          [purchasePayload.addon.id]: expect.objectContaining({
            id: purchasePayload.addon.id,
            ownerPublicKey
          })
        }
      }
    });

    const signedTransferPayload = {
      addonId: purchasePayload.addon.id,
      fromOwnerPublicKey: ownerPublicKey,
      toOwnerPublicKey: receiverPublicKey,
      nonce: `nonce-${crypto.randomUUID()}`,
      timestampMs: Date.now(),
      ttlMs: 60_000
    };
    const transferSignature = await signCanonicalPayload(signedTransferPayload, ownerKeypair.privateKey);

    const transferResponse = await transferRoute.POST(
      new Request("http://localhost/api/transfer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": "admin-fixed-token"
        },
        body: JSON.stringify({
          ...signedTransferPayload,
          signature: transferSignature
        })
      })
    );

    expect(transferResponse.status).toBe(200);
    await expect(transferResponse.json()).resolves.toMatchObject({
      ok: true,
      addonId: purchasePayload.addon.id,
      fromOwnerPublicKey: ownerPublicKey,
      toOwnerPublicKey: receiverPublicKey
    });

    const replayResponse = await transferRoute.POST(
      new Request("http://localhost/api/transfer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": "admin-fixed-token"
        },
        body: JSON.stringify({
          ...signedTransferPayload,
          signature: transferSignature
        })
      })
    );

    expect(replayResponse.status).toBe(409);
    await expect(replayResponse.json()).resolves.toMatchObject({ errorCode: "REPLAYED_TRANSFER_REQUEST" });

    const [ownerInventoryAfter, receiverInventoryAfter, activityResponse] = await Promise.all([
      inventoryRoute.GET(new Request(`http://localhost/api/inventory?ownerPublicKey=${encodeURIComponent(ownerPublicKey)}`)),
      inventoryRoute.GET(new Request(`http://localhost/api/inventory?ownerPublicKey=${encodeURIComponent(receiverPublicKey)}`)),
      activityRoute.GET(
        new Request("http://localhost/api/admin/activity?limit=10&replayOperation=transfer", {
          headers: {
            "x-admin-token": "admin-fixed-token"
          }
        })
      )
    ]);

    await expect(ownerInventoryAfter.json()).resolves.toMatchObject({ snapshot: { ownerPublicKey, addons: {} } });
    await expect(receiverInventoryAfter.json()).resolves.toMatchObject({
      snapshot: {
        ownerPublicKey: receiverPublicKey,
        addons: {
          [purchasePayload.addon.id]: expect.objectContaining({
            id: purchasePayload.addon.id,
            ownerPublicKey: receiverPublicKey
          })
        }
      }
    });
    await expect(activityResponse.json()).resolves.toMatchObject({
      orders: [expect.objectContaining({ addonId: purchasePayload.addon.id })],
      replayNonces: [expect.objectContaining({ nonce: signedTransferPayload.nonce, status: "replayed" })]
    });
  }, 120_000);
});
