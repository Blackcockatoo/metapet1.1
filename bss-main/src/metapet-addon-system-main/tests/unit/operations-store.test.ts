import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppDatabase } from "@/lib/server/app-database-types";

const state = vi.hoisted(() => ({
  database: {
    inventorySnapshots: {},
    listings: {},
    orders: [],
    auditEvents: [],
    replayNonces: [],
    walletSessions: []
  } as AppDatabase
}));

vi.mock("@/lib/server/app-database", () => ({
  readAppDatabase: vi.fn(async () => state.database),
  updateAppDatabase: vi.fn(async (mutate: (database: typeof state.database) => unknown) => mutate(state.database))
}));

vi.mock("@/lib/server/app-database-adapter", () => ({
  getAppDatabaseAdapter: vi.fn(() => ({
    dispose: vi.fn(async () => undefined),
    backend: "json-file",
    read: vi.fn(async () => state.database),
    write: vi.fn(async (database: typeof state.database) => {
      state.database = database;
    }),
    insertAuditEvent: vi.fn(async (record: (typeof state.database.auditEvents)[number]) => {
      state.database.auditEvents.unshift(record);
    }),
    clearAuditEvents: vi.fn(async () => {
      state.database.auditEvents = [];
    }),
    queryAuditEvents: vi.fn(async (query: { action?: string; actorId?: string; search?: string; status?: string; limit?: number } = {}) => {
      const search = query.search?.toLowerCase();
      return state.database.auditEvents
        .filter((event) => {
          if (query.action && event.action !== query.action) {
            return false;
          }

          if (query.actorId && event.actorId !== query.actorId) {
            return false;
          }

          if (query.status && event.status !== query.status) {
            return false;
          }

          if (search && !JSON.stringify(event).toLowerCase().includes(search)) {
            return false;
          }

          return true;
        })
        .slice(0, query.limit ?? 20);
    }),
    clearReplayNonces: vi.fn(async () => {
      state.database.replayNonces = [];
    }),
    queryReplayNonces: vi.fn(async (query: { operation?: string; scopeKey?: string; search?: string; status?: string; limit?: number } = {}) => {
      const search = query.search?.toLowerCase();
      return state.database.replayNonces
        .filter((record) => {
          if (query.operation && record.operation !== query.operation) {
            return false;
          }

          if (query.scopeKey && record.scopeKey !== query.scopeKey) {
            return false;
          }

          if (query.status && record.status !== query.status) {
            return false;
          }

          if (search && !JSON.stringify(record).toLowerCase().includes(search)) {
            return false;
          }

          return true;
        })
        .slice(0, query.limit ?? 20);
    }),
    insertStorefrontOrder: vi.fn(async (order: (typeof state.database.orders)[number]) => {
      state.database.orders.unshift(order);
    }),
    queryStorefrontOrders: vi.fn(async () => []),
    upsertReplayNonce: vi.fn(async (input: { id: string; operation: string; scopeKey: string; nonce: string; status: "accepted" | "replayed" | "expired"; seenAt: string; expiresAt: string }) => {
      const existing = state.database.replayNonces.find(
        (r) => r.operation === input.operation && r.scopeKey === input.scopeKey && r.nonce === input.nonce
      );

      if (existing) {
        existing.attempts += 1;
        existing.lastSeenAt = input.seenAt;
        existing.status = "replayed";
        return "replayed" as const;
      }

      state.database.replayNonces.unshift({
        id: input.id,
        operation: input.operation,
        scopeKey: input.scopeKey,
        nonce: input.nonce,
        status: input.status,
        attempts: 1,
        firstSeenAt: input.seenAt,
        lastSeenAt: input.seenAt,
        expiresAt: input.expiresAt
      });
      return input.status;
    }),
    upsertWalletSession: vi.fn(async (record: (typeof state.database.walletSessions)[number]) => {
      const existingIndex = state.database.walletSessions.findIndex((session) => session.sessionId === record.sessionId);

      if (existingIndex >= 0) {
        state.database.walletSessions[existingIndex] = record;
        return;
      }

      state.database.walletSessions.unshift(record);
    }),
    getWalletSession: vi.fn(async (sessionId: string) => state.database.walletSessions.find((session) => session.sessionId === sessionId)),
    revokeWalletSession: vi.fn(async (sessionId: string, revokedAt: string) => {
      const session = state.database.walletSessions.find((candidate) => candidate.sessionId === sessionId);

      if (!session) {
        return false;
      }

      session.status = "revoked";
      session.revokedAt = revokedAt;
      return true;
    }),
    clearWalletSessions: vi.fn(async () => {
      state.database.walletSessions = [];
    })
  }))
}));

import { clearAuditEvents, listAuditEvents, recordAuditEvent } from "@/lib/server/audit-log";
import { clearReplayNonceRecords, consumeReplayNonce, listReplayNonceRecords } from "@/lib/server/replay-repository";

describe("operations store", () => {
  beforeEach(async () => {
    state.database = {
      inventorySnapshots: {},
      listings: {},
      orders: [],
      auditEvents: [],
      replayNonces: [],
      walletSessions: []
    };
    await clearAuditEvents();
    await clearReplayNonceRecords();
  });

  it("records and filters audit events", async () => {
    await recordAuditEvent({ action: "mint", actorId: "admin", status: "accepted", details: { addonId: "a1" } });
    await recordAuditEvent({ action: "transfer", actorId: "inventory-console", status: "rejected", details: { addonId: "a2" } });

    const events = await listAuditEvents({ action: "transfer" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: "transfer",
      actorId: "inventory-console",
      status: "rejected"
    });

    await expect(listAuditEvents({ search: "addonId\":\"a2" })).resolves.toHaveLength(1);
  });

  it("persists accepted, replayed, and expired nonce records", async () => {
    const baseNow = Date.now();

    const accepted = await consumeReplayNonce({
      operation: "transfer",
      scopeKey: "owner-a",
      nonce: "nonce-1",
      timestampMs: baseNow,
      ttlMs: 5_000,
      nowMs: baseNow + 1_000
    });
    const replayed = await consumeReplayNonce({
      operation: "transfer",
      scopeKey: "owner-a",
      nonce: "nonce-1",
      timestampMs: baseNow,
      ttlMs: 5_000,
      nowMs: baseNow + 1_500
    });
    const expired = await consumeReplayNonce({
      operation: "transfer",
      scopeKey: "owner-b",
      nonce: "nonce-2",
      timestampMs: baseNow,
      ttlMs: 500,
      nowMs: baseNow + 1_000
    });

    const records = await listReplayNonceRecords({ operation: "transfer" });

    expect(accepted).toBe("accepted");
    expect(replayed).toBe("replayed");
    expect(expired).toBe("expired");
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nonce: "nonce-1", status: "replayed", attempts: 2 }),
        expect.objectContaining({ nonce: "nonce-2", status: "expired", attempts: 1 })
      ])
    );

    await expect(listReplayNonceRecords({ search: "owner-b" })).resolves.toEqual([
      expect.objectContaining({ nonce: "nonce-2" })
    ]);
  });
});
