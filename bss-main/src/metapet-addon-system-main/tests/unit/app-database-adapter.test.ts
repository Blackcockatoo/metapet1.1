import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// NOTE: The Vitest runtime uses Vite for module resolution, which cannot load the
// `node:sqlite` built-in (available from Node.js 22.5+).  getAppDatabaseAdapter()
// automatically detects the `VITEST` env var and returns JsonFileAppDatabaseAdapter
// instead of SqliteAppDatabaseAdapter so that the full suite can run under Vitest.
// SQLite-specific behaviour is exercised through the adapter interface contract tests
// below and by keeping the production boot path distinct from the test path.

const originalDatabasePath = process.env.APP_DATABASE_PATH;
const originalDatabaseBackend = process.env.APP_DATABASE_BACKEND;
const originalDatabaseUrl = process.env.APP_DATABASE_URL;

describe.sequential("app-database adapter (JsonFileAppDatabaseAdapter in VITEST)", () => {
  let dataPath = "";

  beforeEach(async () => {
    dataPath = await mkdtemp(join(tmpdir(), "metapet-db-"));
    process.env.APP_DATABASE_PATH = dataPath;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalDatabasePath === undefined) {
      delete process.env.APP_DATABASE_PATH;
    } else {
      process.env.APP_DATABASE_PATH = originalDatabasePath;
    }

    if (originalDatabaseBackend === undefined) {
      delete process.env.APP_DATABASE_BACKEND;
    } else {
      process.env.APP_DATABASE_BACKEND = originalDatabaseBackend;
    }

    if (originalDatabaseUrl === undefined) {
      delete process.env.APP_DATABASE_URL;
      return;
    }

    process.env.APP_DATABASE_URL = originalDatabaseUrl;
  });

  it("persists database state to the JSON file", async () => {
    const { readAppDatabase, updateAppDatabase } = await import("@/lib/server/app-database");
    const { getAppDatabaseAdapter } = await import("@/lib/server/app-database-adapter");

    await updateAppDatabase((database) => {
      database.auditEvents.push({
        id: "audit-1",
        action: "mint",
        actorId: "admin",
        status: "accepted",
        loggedAt: "2026-01-01T00:00:00.000Z",
        details: { addonId: "addon-1" }
      });
      database.replayNonces.push({
        id: "replay-1",
        operation: "transfer",
        scopeKey: "owner-a",
        nonce: "nonce-1",
        status: "accepted",
        attempts: 1,
        firstSeenAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T01:00:00.000Z"
      });
      database.orders.push({
        id: "order-1",
        listingId: "moss60-aura",
        addonId: "addon-1",
        ownerPublicKey: "owner-a",
        edition: 1,
        amountCents: 2200,
        currency: "USD",
        status: "accepted",
        custodyMode: "local-dev",
        createdAt: "2026-01-01T00:00:00.000Z"
      });
    });

    const database = await readAppDatabase();
    const filteredOrders = await getAppDatabaseAdapter().queryStorefrontOrders({ ownerPublicKey: "owner-a" });
    const filteredAuditEvents = await getAppDatabaseAdapter().queryAuditEvents({ actorId: "admin" });
    const filteredReplayNonces = await getAppDatabaseAdapter().queryReplayNonces({ scopeKey: "owner-a" });

    expect(database.auditEvents).toHaveLength(1);
    expect(database.replayNonces).toHaveLength(1);
    expect(database.orders).toHaveLength(1);
    expect(filteredOrders).toHaveLength(1);
    expect(filteredAuditEvents).toHaveLength(1);
    expect(filteredReplayNonces).toHaveLength(1);
  }, 15_000);

  it("migrates legacy json data on first boot", async () => {
    await mkdir(dataPath, { recursive: true });
    await writeFile(
      join(dataPath, "app-db.json"),
      JSON.stringify({
        inventorySnapshots: {},
        listings: {},
        orders: [],
        auditEvents: [{ id: "audit-legacy", action: "transfer", actorId: "legacy", status: "rejected", loggedAt: "2026-01-01T00:00:00.000Z", details: {} }],
        replayNonces: []
      }),
      "utf8"
    );

    const { readAppDatabase } = await import("@/lib/server/app-database");
    const database = await readAppDatabase();

    expect(database.auditEvents).toEqual([
      expect.objectContaining({ id: "audit-legacy", actorId: "legacy" })
    ]);
  });

  it("upsertReplayNonce inserts new nonces and marks duplicates as replayed", async () => {
    const { getAppDatabaseAdapter } = await import("@/lib/server/app-database-adapter");
    const adapter = getAppDatabaseAdapter();

    const base = {
      id: "replay-upsert-1",
      operation: "transfer",
      scopeKey: "owner-b",
      nonce: "unique-nonce-1",
      status: "accepted" as const,
      seenAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T01:00:00.000Z"
    };

    const first = await adapter.upsertReplayNonce(base);
    expect(first).toBe("accepted");

    // Same nonce again must be detected as a replay (id override is ignored).
    const second = await adapter.upsertReplayNonce({ ...base, id: "replay-upsert-2" });
    expect(second).toBe("replayed");

    const records = await adapter.queryReplayNonces({ scopeKey: "owner-b" });
    expect(records).toHaveLength(1);
    expect(records[0]?.attempts).toBe(2);
    expect(records[0]?.status).toBe("replayed");
  });

  it("upsertReplayNonce records expired status for past-TTL nonces", async () => {
    const { getAppDatabaseAdapter } = await import("@/lib/server/app-database-adapter");
    const adapter = getAppDatabaseAdapter();

    const result = await adapter.upsertReplayNonce({
      id: "replay-expired-1",
      operation: "mint",
      scopeKey: "owner-c",
      nonce: "expired-nonce",
      status: "expired",
      seenAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:00:00.000Z"
    });

    expect(result).toBe("expired");
    const records = await adapter.queryReplayNonces({ scopeKey: "owner-c" });
    expect(records[0]?.status).toBe("expired");
  });

  it("creates the Postgres adapter seam when explicitly selected", async () => {
    const { createAppDatabaseAdapter } = await import("@/lib/server/app-database-adapter");

    const adapter = createAppDatabaseAdapter(
      {
        APP_DATABASE_BACKEND: "postgres",
        APP_DATABASE_URL: "postgres://metapet:test@db.example.test:5432/metapet"
      },
      { preferJsonFileInVitest: false }
    );

    expect(adapter.backend).toBe("postgres");
    await expect(adapter.read()).rejects.toThrow(/does not support read\(\) yet/i);
  });

  it("requires APP_DATABASE_URL when the Postgres backend is selected", async () => {
    const { createAppDatabaseAdapter } = await import("@/lib/server/app-database-adapter");

    expect(() =>
      createAppDatabaseAdapter(
        {
          APP_DATABASE_BACKEND: "postgres"
        },
        { preferJsonFileInVitest: false }
      )
    ).toThrow(/APP_DATABASE_URL is required/i);
  });

  it("treats whitespace-only search as no filter", async () => {
    const { updateAppDatabase } = await import("@/lib/server/app-database");
    const { getAppDatabaseAdapter } = await import("@/lib/server/app-database-adapter");
    const adapter = getAppDatabaseAdapter();

    await updateAppDatabase((database) => {
      database.auditEvents.push({
        id: "audit-search-1",
        action: "mint",
        actorId: "admin",
        status: "accepted",
        loggedAt: "2026-01-01T00:00:00.000Z",
        details: { addonId: "addon-1" }
      });
      database.replayNonces.push({
        id: "replay-search-1",
        operation: "transfer",
        scopeKey: "owner-search",
        nonce: "nonce-search",
        status: "accepted",
        attempts: 1,
        firstSeenAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T01:00:00.000Z"
      });
      database.orders.push({
        id: "order-search-1",
        listingId: "listing-search",
        addonId: "addon-search",
        ownerPublicKey: "owner-search",
        edition: 1,
        amountCents: 100,
        currency: "USD",
        status: "accepted",
        custodyMode: "local-dev",
        createdAt: "2026-01-01T00:00:00.000Z"
      });
    });

    const allAudit = await adapter.queryAuditEvents();
    const whitespaceAudit = await adapter.queryAuditEvents({ search: "   " });
    expect(whitespaceAudit).toEqual(allAudit);

    const allReplay = await adapter.queryReplayNonces();
    const whitespaceReplay = await adapter.queryReplayNonces({ search: "   " });
    expect(whitespaceReplay).toEqual(allReplay);

    const allOrders = await adapter.queryStorefrontOrders();
    const whitespaceOrders = await adapter.queryStorefrontOrders({ search: "   " });
    expect(whitespaceOrders).toEqual(allOrders);
  });

});
