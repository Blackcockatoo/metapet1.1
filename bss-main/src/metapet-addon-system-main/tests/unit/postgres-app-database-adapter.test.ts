import { beforeEach, describe, expect, it, vi } from "vitest";

const postgresState = vi.hoisted(() => ({
  nextReplayStatus: "accepted" as "accepted" | "replayed" | "expired",
  queryCalls: [] as Array<{ text: string; params: unknown[] }>,
  replayRows: [] as Array<{
    id: string;
    operation: string;
    scope_key: string;
    nonce: string;
    status: "accepted" | "replayed" | "expired";
    attempts: number | string;
    first_seen_at: string;
    last_seen_at: string;
    expires_at: string;
  }>
}));

const queryMock = vi.hoisted(() =>
  vi.fn(async (text: string, params: readonly unknown[] = []) => {
    postgresState.queryCalls.push({ text, params: [...params] });

    if (text.includes("CREATE TABLE IF NOT EXISTS")) {
      return { rowCount: null, rows: [] };
    }

    if (text.startsWith("INSERT INTO replay_nonces")) {
      return { rowCount: 1, rows: [{ status: postgresState.nextReplayStatus }] };
    }

    if (text.startsWith("SELECT id, operation, scope_key, nonce, status, attempts, first_seen_at, last_seen_at, expires_at FROM replay_nonces")) {
      return { rowCount: postgresState.replayRows.length, rows: postgresState.replayRows };
    }

    if (text.startsWith("INSERT INTO audit_events")) {
      return { rowCount: 1, rows: [] };
    }

    if (text.startsWith("INSERT INTO storefront_orders")) {
      return { rowCount: 1, rows: [] };
    }

    if (text.startsWith("DELETE FROM replay_nonces") || text.startsWith("DELETE FROM audit_events")) {
      return { rowCount: 0, rows: [] };
    }

    return { rowCount: 0, rows: [] };
  })
);

const createPostgresClientMock = vi.hoisted(() =>
  vi.fn(async () => ({
    query: queryMock,
    end: vi.fn(async () => undefined)
  }))
);

vi.mock("@/lib/server/postgres-client", () => ({
  createPostgresClient: createPostgresClientMock
}));

describe("Postgres app-database adapter", () => {
  beforeEach(() => {
    postgresState.nextReplayStatus = "accepted";
    postgresState.queryCalls = [];
    postgresState.replayRows = [];
    queryMock.mockClear();
    createPostgresClientMock.mockClear();
    vi.resetModules();
  });

  it("upserts replay nonces through the Postgres client", async () => {
    const { createAppDatabaseAdapter } = await import("@/lib/server/app-database-adapter");

    const adapter = createAppDatabaseAdapter(
      {
        APP_DATABASE_BACKEND: "postgres",
        APP_DATABASE_URL: "postgres://metapet:test@db.example.test:5432/metapet"
      },
      { preferJsonFileInVitest: false }
    );

    const status = await adapter.upsertReplayNonce({
      id: "replay-1",
      operation: "transfer",
      scopeKey: "owner-a",
      nonce: "nonce-1",
      status: "accepted",
      seenAt: "2026-03-13T00:00:00.000Z",
      expiresAt: "2026-03-13T00:05:00.000Z"
    });

    expect(status).toBe("accepted");
    expect(createPostgresClientMock).toHaveBeenCalledWith("postgres://metapet:test@db.example.test:5432/metapet");
    expect(postgresState.queryCalls.some((call) => call.text.startsWith("INSERT INTO replay_nonces"))).toBe(true);
  });

  it("maps replay-nonce query rows from Postgres", async () => {
    postgresState.replayRows = [
      {
        id: "replay-2",
        operation: "transfer",
        scope_key: "owner-b",
        nonce: "nonce-2",
        status: "replayed",
        attempts: "2",
        first_seen_at: "2026-03-13T00:00:00.000Z",
        last_seen_at: "2026-03-13T00:00:01.000Z",
        expires_at: "2026-03-13T00:05:00.000Z"
      }
    ];

    const { createAppDatabaseAdapter } = await import("@/lib/server/app-database-adapter");

    const adapter = createAppDatabaseAdapter(
      {
        APP_DATABASE_BACKEND: "postgres",
        APP_DATABASE_URL: "postgres://metapet:test@db.example.test:5432/metapet"
      },
      { preferJsonFileInVitest: false }
    );

    const rows = await adapter.queryReplayNonces({
      operation: "transfer",
      scopeKey: "owner-b",
      status: "replayed",
      search: "nonce",
      limit: 5
    });

    expect(rows).toEqual([
      {
        id: "replay-2",
        operation: "transfer",
        scopeKey: "owner-b",
        nonce: "nonce-2",
        status: "replayed",
        attempts: 2,
        firstSeenAt: "2026-03-13T00:00:00.000Z",
        lastSeenAt: "2026-03-13T00:00:01.000Z",
        expiresAt: "2026-03-13T00:05:00.000Z"
      }
    ]);
    expect(postgresState.queryCalls.at(-1)?.params).toEqual(["transfer", "owner-b", "replayed", "%nonce%", 5]);
  });

  it("persists signer key IDs when writing audit events and orders", async () => {
    const { createAppDatabaseAdapter } = await import("@/lib/server/app-database-adapter");

    const adapter = createAppDatabaseAdapter(
      {
        APP_DATABASE_BACKEND: "postgres",
        APP_DATABASE_URL: "postgres://metapet:test@db.example.test:5432/metapet"
      },
      { preferJsonFileInVitest: false }
    );

    await adapter.insertAuditEvent({
      id: "audit-1",
      action: "mint",
      actorId: "admin",
      status: "accepted",
      loggedAt: "2026-03-13T00:00:00.000Z",
      details: { signerKeyId: "issuer-key-v3" }
    });
    await adapter.insertStorefrontOrder({
      id: "order-1",
      listingId: "moss60-aura",
      addonId: "addon-1",
      ownerPublicKey: "owner-a",
      edition: 1,
      amountCents: 2200,
      currency: "USD",
      status: "accepted",
      custodyMode: "managed",
      signerKeyId: "issuer-key-v3",
      createdAt: "2026-03-13T00:00:00.000Z"
    });

    const auditInsert = postgresState.queryCalls.find((call) => call.text.startsWith("INSERT INTO audit_events"));
    const orderInsert = postgresState.queryCalls.find((call) => call.text.startsWith("INSERT INTO storefront_orders"));

    expect(auditInsert?.params.at(-1)).toBe("issuer-key-v3");
    expect(orderInsert?.params[4]).toBe("issuer-key-v3");
  });
});
