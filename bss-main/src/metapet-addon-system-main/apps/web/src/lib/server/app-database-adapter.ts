import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync as SqliteDatabase } from "node:sqlite";

import { parseServerEnv } from "@bluesnake-studios/config";

import type { AddonStoreSnapshot } from "@bluesnake-studios/addon-store";

import { normalizeAppDatabase, type AppDatabase } from "@/lib/server/app-database-types";
import type { AuditEventRecord, ReplayNonceRecord, WalletSessionRecord } from "@/lib/server/operations-store";
import { createPostgresClient, type PostgresClient } from "@/lib/server/postgres-client";
import type { StorefrontListing, StorefrontOrder } from "@/lib/storefront/types";

export type AppDatabaseAdapterBackend = "json-file" | "sqlite" | "postgres";

export interface ConsumeReplayNonceInput {
  id: string;
  operation: string;
  scopeKey: string;
  nonce: string;
  status: ReplayNonceRecord["status"];
  seenAt: string;
  expiresAt: string;
}

export interface AppDatabaseTransaction {
  loadInventorySnapshot(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined>;
  saveInventorySnapshot(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void>;
  clearInventorySnapshot(ownerPublicKey: string): Promise<void>;
  getStorefrontListing(listingId: string): Promise<StorefrontListing | undefined>;
  upsertStorefrontListing(listing: StorefrontListing): Promise<void>;
  insertStorefrontOrder(order: StorefrontOrder): Promise<void>;
  upsertReplayNonce(input: ConsumeReplayNonceInput): Promise<ReplayNonceRecord["status"]>;
}

export interface AppDatabaseAdapter {
  readonly backend: AppDatabaseAdapterBackend;
  dispose(): Promise<void>;
  runTransaction<T>(work: (transaction: AppDatabaseTransaction) => Promise<T>): Promise<T>;
  read(): Promise<AppDatabase>;
  loadInventorySnapshot(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined>;
  saveInventorySnapshot(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void>;
  clearInventorySnapshot(ownerPublicKey: string): Promise<void>;
  insertAuditEvent(record: AuditEventRecord): Promise<void>;
  clearAuditEvents(): Promise<void>;
  queryAuditEvents(query?: AuditEventQuery): Promise<AuditEventRecord[]>;
  clearReplayNonces(): Promise<void>;
  queryReplayNonces(query?: ReplayNonceQuery): Promise<ReplayNonceRecord[]>;
  upsertWalletSession(record: WalletSessionRecord): Promise<void>;
  getWalletSession(sessionId: string): Promise<WalletSessionRecord | undefined>;
  revokeWalletSession(sessionId: string, revokedAt: string): Promise<boolean>;
  clearWalletSessions(): Promise<void>;
  listStorefrontListings(query?: StorefrontListingQuery): Promise<StorefrontListing[]>;
  getStorefrontListing(listingId: string): Promise<StorefrontListing | undefined>;
  upsertStorefrontListing(listing: StorefrontListing): Promise<void>;
  insertStorefrontOrder(order: StorefrontOrder): Promise<void>;
  queryStorefrontOrders(query?: StorefrontOrderQuery): Promise<StorefrontOrder[]>;
  write(database: AppDatabase): Promise<void>;
  /**
   * Atomically insert or update a replay-nonce record and return the resulting status.
   * In SQLite this runs as a single atomic statement so it is safe under concurrent
   * requests without requiring an application-level write queue.
   */
  upsertReplayNonce(input: ConsumeReplayNonceInput): Promise<ReplayNonceRecord["status"]>;
}

export interface AuditEventQuery {
  actorId?: string;
  action?: AuditEventRecord["action"];
  limit?: number;
  search?: string;
  status?: AuditEventRecord["status"];
}

export interface ReplayNonceQuery {
  limit?: number;
  operation?: string;
  scopeKey?: string;
  search?: string;
  status?: ReplayNonceRecord["status"];
}

export interface StorefrontOrderQuery {
  limit?: number;
  listingId?: string;
  ownerPublicKey?: string;
  search?: string;
}

export interface StorefrontListingQuery {
  includeHidden?: boolean;
}

export interface CreateAppDatabaseAdapterOptions {
  preferJsonFileInVitest?: boolean;
}

function unsupportedPostgresOperation(methodName: string): Error {
  return new Error(`APP_DATABASE_BACKEND=postgres does not support ${methodName} yet.`);
}

function parseNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function normalizeSearch(search?: string): string | undefined {
  const normalized = search?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function matchesSearch(values: Array<string | number | undefined>, search?: string): boolean {
  if (!search) {
    return true;
  }

  return values.join(" ").toLowerCase().includes(search);
}

function sortAuditEvents(left: AuditEventRecord, right: AuditEventRecord): number {
  return right.loggedAt.localeCompare(left.loggedAt);
}

function sortReplayNonces(left: ReplayNonceRecord, right: ReplayNonceRecord): number {
  return right.lastSeenAt.localeCompare(left.lastSeenAt);
}

function sortStorefrontOrders(left: StorefrontOrder, right: StorefrontOrder): number {
  return right.createdAt.localeCompare(left.createdAt);
}

function sortStorefrontListings(left: StorefrontListing, right: StorefrontListing): number {
  if (left.status !== right.status) {
    return left.status === "active" ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}

class JsonFileAppDatabaseAdapter implements AppDatabaseAdapter {
  readonly backend = "json-file" as const;

  private transactionQueue: Promise<void> = Promise.resolve();

  async dispose(): Promise<void> {}

  async runTransaction<T>(work: (transaction: AppDatabaseTransaction) => Promise<T>): Promise<T> {
    const activeTransaction = this.transactionQueue;
    let releaseTransaction: (() => void) | undefined;

    this.transactionQueue = activeTransaction.then(
      () =>
        new Promise<void>((resolve) => {
          releaseTransaction = resolve;
        })
    );

    await activeTransaction;

    try {
      const database = await this.read();
      const transaction: AppDatabaseTransaction = {
        loadInventorySnapshot: async (ownerPublicKey) => database.inventorySnapshots[ownerPublicKey],
        saveInventorySnapshot: async (ownerPublicKey, snapshot) => {
          database.inventorySnapshots[ownerPublicKey] = snapshot;
        },
        clearInventorySnapshot: async (ownerPublicKey) => {
          delete database.inventorySnapshots[ownerPublicKey];
        },
        getStorefrontListing: async (listingId) => database.listings[listingId],
        upsertStorefrontListing: async (listing) => {
          database.listings[listing.id] = listing;
        },
        insertStorefrontOrder: async (order) => {
          database.orders.unshift(order);
        },
        upsertReplayNonce: async (input) => {
          const existing = database.replayNonces.find(
            (record) => record.operation === input.operation && record.scopeKey === input.scopeKey && record.nonce === input.nonce
          );

          if (existing) {
            existing.attempts += 1;
            existing.lastSeenAt = input.seenAt;
            existing.status = "replayed";
            return "replayed";
          }

          database.replayNonces.unshift({
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
        }
      };

      const result = await work(transaction);
      await this.write(database);
      return result;
    } finally {
      releaseTransaction?.();
    }
  }

  async read(): Promise<AppDatabase> {
    try {
      const raw = await readFile(getLegacyJsonPath(), "utf8");
      return normalizeAppDatabase(JSON.parse(raw) as Partial<AppDatabase>);
    } catch {
      return normalizeAppDatabase({});
    }
  }

  async loadInventorySnapshot(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined> {
    const database = await this.read();
    return database.inventorySnapshots[ownerPublicKey];
  }

  async saveInventorySnapshot(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void> {
    const database = await this.read();
    database.inventorySnapshots[ownerPublicKey] = snapshot;
    await this.write(database);
  }

  async clearInventorySnapshot(ownerPublicKey: string): Promise<void> {
    const database = await this.read();
    delete database.inventorySnapshots[ownerPublicKey];
    await this.write(database);
  }

  async insertAuditEvent(record: AuditEventRecord): Promise<void> {
    const database = await this.read();
    database.auditEvents.unshift(record);
    await this.write(database);
  }

  async clearAuditEvents(): Promise<void> {
    const database = await this.read();
    database.auditEvents = [];
    await this.write(database);
  }

  async queryAuditEvents(query: AuditEventQuery = {}): Promise<AuditEventRecord[]> {
    const database = await this.read();
    const search = normalizeSearch(query.search);

    return database.auditEvents
      .filter((event) => {
        if (query.actorId && event.actorId !== query.actorId) {
          return false;
        }

        if (query.action && event.action !== query.action) {
          return false;
        }

        if (query.status && event.status !== query.status) {
          return false;
        }

        return matchesSearch([event.action, event.actorId, event.status, event.loggedAt, JSON.stringify(event.details)], search);
      })
      .sort(sortAuditEvents)
      .slice(0, query.limit ?? 20);
  }

  async clearReplayNonces(): Promise<void> {
    const database = await this.read();
    database.replayNonces = [];
    await this.write(database);
  }

  async queryReplayNonces(query: ReplayNonceQuery = {}): Promise<ReplayNonceRecord[]> {
    const database = await this.read();
    const search = normalizeSearch(query.search);

    return database.replayNonces
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

        return matchesSearch([record.operation, record.scopeKey, record.nonce, record.status, record.lastSeenAt], search);
      })
      .sort(sortReplayNonces)
      .slice(0, query.limit ?? 20);
  }

  async upsertWalletSession(record: WalletSessionRecord): Promise<void> {
    const database = await this.read();
    const existingIndex = database.walletSessions.findIndex((session) => session.sessionId === record.sessionId);

    if (existingIndex >= 0) {
      database.walletSessions[existingIndex] = record;
    } else {
      database.walletSessions.unshift(record);
    }

    await this.write(database);
  }

  async getWalletSession(sessionId: string): Promise<WalletSessionRecord | undefined> {
    const database = await this.read();
    return database.walletSessions.find((session) => session.sessionId === sessionId);
  }

  async revokeWalletSession(sessionId: string, revokedAt: string): Promise<boolean> {
    const database = await this.read();
    const session = database.walletSessions.find((candidate) => candidate.sessionId === sessionId);

    if (!session) {
      return false;
    }

    session.status = "revoked";
    session.revokedAt = revokedAt;
    await this.write(database);
    return true;
  }

  async clearWalletSessions(): Promise<void> {
    const database = await this.read();
    database.walletSessions = [];
    await this.write(database);
  }

  async listStorefrontListings(query: StorefrontListingQuery = {}): Promise<StorefrontListing[]> {
    const database = await this.read();

    return Object.values(database.listings)
      .filter((listing) => query.includeHidden || listing.visibility === "public")
      .sort(sortStorefrontListings);
  }

  async getStorefrontListing(listingId: string): Promise<StorefrontListing | undefined> {
    const database = await this.read();
    return database.listings[listingId];
  }

  async upsertStorefrontListing(listing: StorefrontListing): Promise<void> {
    const database = await this.read();
    database.listings[listing.id] = listing;
    await this.write(database);
  }

  async insertStorefrontOrder(order: StorefrontOrder): Promise<void> {
    const database = await this.read();
    database.orders.unshift(order);
    await this.write(database);
  }

  async queryStorefrontOrders(query: StorefrontOrderQuery = {}): Promise<StorefrontOrder[]> {
    const database = await this.read();
    const search = normalizeSearch(query.search);

    return database.orders
      .filter((order) => {
        if (query.listingId && order.listingId !== query.listingId) {
          return false;
        }

        if (query.ownerPublicKey && order.ownerPublicKey !== query.ownerPublicKey) {
          return false;
        }

        return matchesSearch([order.id, order.listingId, order.addonId, order.ownerPublicKey, order.currency, order.signerKeyId, order.createdAt], search);
      })
      .sort(sortStorefrontOrders)
      .slice(0, query.limit ?? 20);
  }

  async write(database: AppDatabase): Promise<void> {
    await mkdir(getDataDirectoryPath(), { recursive: true });
    await writeFile(getLegacyJsonPath(), JSON.stringify(database, null, 2), "utf8");
  }

  async upsertReplayNonce(input: ConsumeReplayNonceInput): Promise<ReplayNonceRecord["status"]> {
    const database = await this.read();
    const existing = database.replayNonces.find(
      (r) => r.operation === input.operation && r.scopeKey === input.scopeKey && r.nonce === input.nonce
    );

    if (existing) {
      existing.attempts += 1;
      existing.lastSeenAt = input.seenAt;
      existing.status = "replayed";
      await this.write(database);
      return "replayed";
    }

    database.replayNonces.unshift({
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
    await this.write(database);
    return input.status;
  }
}

function getDataDirectoryPath(): string {
  const configuredPath = process.env.APP_DATABASE_PATH;

  if (configuredPath) {
    return configuredPath;
  }

  return join(process.cwd(), ".data");
}

function getSqlitePath(): string {
  return join(getDataDirectoryPath(), "app.db");
}

function getLegacyJsonPath(): string {
  return join(getDataDirectoryPath(), "app-db.json");
}

class PostgresAppDatabaseAdapter implements AppDatabaseAdapter {
  readonly backend = "postgres" as const;

  private clientPromise: Promise<PostgresClient> | undefined;

  constructor(private readonly connectionString: string) {}

  async dispose(): Promise<void> {
    if (!this.clientPromise) {
      return;
    }

    const client = await this.clientPromise;
    await client.end();
    this.clientPromise = undefined;
  }

  async runTransaction<T>(work: (transaction: AppDatabaseTransaction) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    const transactionClient = await client.connect();
    await transactionClient.query("BEGIN");

    const transaction: AppDatabaseTransaction = {
      loadInventorySnapshot: async (ownerPublicKey) => {
        const result = await transactionClient.query<{ snapshot_json: AddonStoreSnapshot | string }>(
          "SELECT snapshot_json FROM inventory_snapshots WHERE owner_public_key = $1",
          [ownerPublicKey]
        );
        const snapshot = result.rows[0]?.snapshot_json;

        if (!snapshot) {
          return undefined;
        }

        return typeof snapshot === "string" ? (JSON.parse(snapshot) as AddonStoreSnapshot) : snapshot;
      },
      saveInventorySnapshot: async (ownerPublicKey, snapshot) => {
        await transactionClient.query(
          "INSERT INTO inventory_snapshots (owner_public_key, snapshot_json) VALUES ($1, $2::jsonb) ON CONFLICT (owner_public_key) DO UPDATE SET snapshot_json = EXCLUDED.snapshot_json",
          [ownerPublicKey, JSON.stringify(snapshot)]
        );
      },
      clearInventorySnapshot: async (ownerPublicKey) => {
        await transactionClient.query("DELETE FROM inventory_snapshots WHERE owner_public_key = $1", [ownerPublicKey]);
      },
      getStorefrontListing: async (listingId) => {
        const result = await transactionClient.query<{ listing_json: StorefrontListing | string }>(
          "SELECT listing_json FROM listings WHERE listing_id = $1",
          [listingId]
        );
        const listing = result.rows[0]?.listing_json;

        if (!listing) {
          return undefined;
        }

        return typeof listing === "string" ? (JSON.parse(listing) as StorefrontListing) : listing;
      },
      upsertStorefrontListing: async (listing) => {
        await transactionClient.query(
          [
            "INSERT INTO listings (listing_id, status, visibility, name, sold_count, listing_json)",
            "VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
            "ON CONFLICT (listing_id)",
            "DO UPDATE SET status = EXCLUDED.status, visibility = EXCLUDED.visibility, name = EXCLUDED.name, sold_count = EXCLUDED.sold_count, listing_json = EXCLUDED.listing_json"
          ].join(" "),
          [listing.id, listing.status, listing.visibility, listing.name, listing.soldCount, JSON.stringify(listing)]
        );
      },
      insertStorefrontOrder: async (order) => {
        await transactionClient.query(
          "INSERT INTO storefront_orders (id, listing_id, owner_public_key, created_at, signer_key_id, order_json) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
          [order.id, order.listingId, order.ownerPublicKey, order.createdAt, order.signerKeyId ?? null, JSON.stringify(order)]
        );
      },
      upsertReplayNonce: async (input) => {
        const result = await transactionClient.query<{ status: ReplayNonceRecord["status"] }>(
          [
            "INSERT INTO replay_nonces (id, operation, scope_key, nonce, status, attempts, first_seen_at, last_seen_at, expires_at)",
            "VALUES ($1, $2, $3, $4, $5, 1, $6, $6, $7)",
            "ON CONFLICT (operation, scope_key, nonce)",
            "DO UPDATE SET attempts = replay_nonces.attempts + 1, last_seen_at = EXCLUDED.last_seen_at, status = 'replayed'",
            "RETURNING status"
          ].join(" "),
          [input.id, input.operation, input.scopeKey, input.nonce, input.status, input.seenAt, input.expiresAt]
        );

        return result.rows[0]?.status ?? input.status;
      }
    };

    try {
      const result = await work(transaction);
      await transactionClient.query("COMMIT");
      return result;
    } catch (error) {
      await transactionClient.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      transactionClient.release();
    }
  }

  async read(): Promise<AppDatabase> {
    throw unsupportedPostgresOperation("read()");
  }

  async loadInventorySnapshot(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined> {
    const client = await this.getClient();
    const result = await client.query<{ snapshot_json: AddonStoreSnapshot | string }>(
      "SELECT snapshot_json FROM inventory_snapshots WHERE owner_public_key = $1",
      [ownerPublicKey]
    );
    const snapshot = result.rows[0]?.snapshot_json;

    if (!snapshot) {
      return undefined;
    }

    return typeof snapshot === "string" ? (JSON.parse(snapshot) as AddonStoreSnapshot) : snapshot;
  }

  async saveInventorySnapshot(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void> {
    const client = await this.getClient();

    await client.query(
      "INSERT INTO inventory_snapshots (owner_public_key, snapshot_json) VALUES ($1, $2::jsonb) ON CONFLICT (owner_public_key) DO UPDATE SET snapshot_json = EXCLUDED.snapshot_json",
      [ownerPublicKey, JSON.stringify(snapshot)]
    );
  }

  async clearInventorySnapshot(ownerPublicKey: string): Promise<void> {
    const client = await this.getClient();
    await client.query("DELETE FROM inventory_snapshots WHERE owner_public_key = $1", [ownerPublicKey]);
  }

  async insertAuditEvent(record: AuditEventRecord): Promise<void> {
    const client = await this.getClient();

    await client.query(
      "INSERT INTO audit_events (id, action, actor_id, status, logged_at, details_json, signer_key_id) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)",
      [record.id, record.action, record.actorId, record.status, record.loggedAt, JSON.stringify(record.details), this.extractSignerKeyId(record.details)]
    );
  }

  async clearAuditEvents(): Promise<void> {
    const client = await this.getClient();
    await client.query("DELETE FROM audit_events");
  }

  async queryAuditEvents(query: AuditEventQuery = {}): Promise<AuditEventRecord[]> {
    const client = await this.getClient();
    const conditions: string[] = [];
    const values: unknown[] = [];
    const normalizedSearch = normalizeSearch(query.search);

    if (query.actorId) {
      values.push(query.actorId);
      conditions.push(`actor_id = $${values.length}`);
    }

    if (query.action) {
      values.push(query.action);
      conditions.push(`action = $${values.length}`);
    }

    if (query.status) {
      values.push(query.status);
      conditions.push(`status = $${values.length}`);
    }

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      const placeholder = `$${values.length}`;
      conditions.push(
        `(lower(actor_id) LIKE ${placeholder} OR lower(action) LIKE ${placeholder} OR lower(status) LIKE ${placeholder} OR lower(logged_at) LIKE ${placeholder} OR lower(details_json::text) LIKE ${placeholder} OR lower(coalesce(signer_key_id, '')) LIKE ${placeholder})`
      );
    }

    values.push(query.limit ?? 20);

    const result = await client.query<{
      id: string;
      action: AuditEventRecord["action"];
      actor_id: string;
      status: AuditEventRecord["status"];
      logged_at: string;
      details_json: Record<string, unknown> | string;
    }>(
      `SELECT id, action, actor_id, status, logged_at, details_json FROM audit_events${conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY logged_at DESC, id DESC LIMIT $${values.length}`,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.actor_id,
      status: row.status,
      loggedAt: row.logged_at,
      details: typeof row.details_json === "string" ? (JSON.parse(row.details_json) as Record<string, unknown>) : row.details_json
    }));
  }

  async clearReplayNonces(): Promise<void> {
    const client = await this.getClient();
    await client.query("DELETE FROM replay_nonces");
  }

  async queryReplayNonces(query: ReplayNonceQuery = {}): Promise<ReplayNonceRecord[]> {
    const client = await this.getClient();
    const conditions: string[] = [];
    const values: unknown[] = [];
    const normalizedSearch = normalizeSearch(query.search);

    if (query.operation) {
      values.push(query.operation);
      conditions.push(`operation = $${values.length}`);
    }

    if (query.scopeKey) {
      values.push(query.scopeKey);
      conditions.push(`scope_key = $${values.length}`);
    }

    if (query.status) {
      values.push(query.status);
      conditions.push(`status = $${values.length}`);
    }

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      const placeholder = `$${values.length}`;
      conditions.push(
        `(lower(operation) LIKE ${placeholder} OR lower(scope_key) LIKE ${placeholder} OR lower(nonce) LIKE ${placeholder} OR lower(status) LIKE ${placeholder} OR lower(last_seen_at) LIKE ${placeholder})`
      );
    }

    values.push(query.limit ?? 20);

    const result = await client.query<{
      id: string;
      operation: string;
      scope_key: string;
      nonce: string;
      status: ReplayNonceRecord["status"];
      attempts: number | string;
      first_seen_at: string;
      last_seen_at: string;
      expires_at: string;
    }>(
      `SELECT id, operation, scope_key, nonce, status, attempts, first_seen_at, last_seen_at, expires_at FROM replay_nonces${conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY last_seen_at DESC, id DESC LIMIT $${values.length}`,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      operation: row.operation,
      scopeKey: row.scope_key,
      nonce: row.nonce,
      status: row.status,
      attempts: parseNumber(row.attempts),
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at
    }));
  }

  async upsertWalletSession(record: WalletSessionRecord): Promise<void> {
    const client = await this.getClient();

    await client.query(
      [
        "INSERT INTO wallet_sessions (session_id, owner_public_key, status, issued_at, expires_at, revoked_at)",
        "VALUES ($1, $2, $3, $4, $5, $6)",
        "ON CONFLICT (session_id)",
        "DO UPDATE SET owner_public_key = EXCLUDED.owner_public_key, status = EXCLUDED.status, issued_at = EXCLUDED.issued_at, expires_at = EXCLUDED.expires_at, revoked_at = EXCLUDED.revoked_at"
      ].join(" "),
      [record.sessionId, record.ownerPublicKey, record.status, record.issuedAt, record.expiresAt, record.revokedAt ?? null]
    );
  }

  async getWalletSession(sessionId: string): Promise<WalletSessionRecord | undefined> {
    const client = await this.getClient();
    const result = await client.query<{
      session_id: string;
      owner_public_key: string;
      status: WalletSessionRecord["status"];
      issued_at: string;
      expires_at: string;
      revoked_at: string | null;
    }>("SELECT session_id, owner_public_key, status, issued_at, expires_at, revoked_at FROM wallet_sessions WHERE session_id = $1", [sessionId]);
    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return {
      sessionId: row.session_id,
      ownerPublicKey: row.owner_public_key,
      status: row.status,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at ?? undefined
    };
  }

  async revokeWalletSession(sessionId: string, revokedAt: string): Promise<boolean> {
    const client = await this.getClient();
    const result = await client.query(
      "UPDATE wallet_sessions SET status = 'revoked', revoked_at = $2 WHERE session_id = $1 AND status <> 'revoked'",
      [sessionId, revokedAt]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async clearWalletSessions(): Promise<void> {
    const client = await this.getClient();
    await client.query("DELETE FROM wallet_sessions");
  }

  async listStorefrontListings(query: StorefrontListingQuery = {}): Promise<StorefrontListing[]> {
    const client = await this.getClient();
    const values: unknown[] = [];
    const whereClause = query.includeHidden
      ? ""
      : (() => {
          values.push("public");
          return ` WHERE visibility = $${values.length}`;
        })();

    const result = await client.query<{ listing_json: StorefrontListing | string }>(
      `SELECT listing_json FROM listings${whereClause} ORDER BY status ASC, name ASC`,
      values
    );

    return result.rows
      .map((row) => (typeof row.listing_json === "string" ? (JSON.parse(row.listing_json) as StorefrontListing) : row.listing_json))
      .sort(sortStorefrontListings);
  }

  async getStorefrontListing(listingId: string): Promise<StorefrontListing | undefined> {
    const client = await this.getClient();
    const result = await client.query<{ listing_json: StorefrontListing | string }>(
      "SELECT listing_json FROM listings WHERE listing_id = $1",
      [listingId]
    );
    const listing = result.rows[0]?.listing_json;

    if (!listing) {
      return undefined;
    }

    return typeof listing === "string" ? (JSON.parse(listing) as StorefrontListing) : listing;
  }

  async upsertStorefrontListing(listing: StorefrontListing): Promise<void> {
    const client = await this.getClient();

    await client.query(
      [
        "INSERT INTO listings (listing_id, status, visibility, name, sold_count, listing_json)",
        "VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
        "ON CONFLICT (listing_id)",
        "DO UPDATE SET status = EXCLUDED.status, visibility = EXCLUDED.visibility, name = EXCLUDED.name, sold_count = EXCLUDED.sold_count, listing_json = EXCLUDED.listing_json"
      ].join(" "),
      [listing.id, listing.status, listing.visibility, listing.name, listing.soldCount, JSON.stringify(listing)]
    );
  }

  async insertStorefrontOrder(order: StorefrontOrder): Promise<void> {
    const client = await this.getClient();

    await client.query(
      "INSERT INTO storefront_orders (id, listing_id, owner_public_key, created_at, signer_key_id, order_json) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
      [order.id, order.listingId, order.ownerPublicKey, order.createdAt, order.signerKeyId ?? null, JSON.stringify(order)]
    );
  }

  async queryStorefrontOrders(query: StorefrontOrderQuery = {}): Promise<StorefrontOrder[]> {
    const client = await this.getClient();
    const conditions: string[] = [];
    const values: unknown[] = [];
    const normalizedSearch = normalizeSearch(query.search);

    if (query.listingId) {
      values.push(query.listingId);
      conditions.push(`listing_id = $${values.length}`);
    }

    if (query.ownerPublicKey) {
      values.push(query.ownerPublicKey);
      conditions.push(`owner_public_key = $${values.length}`);
    }

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      const placeholder = `$${values.length}`;
      conditions.push(`(lower(id) LIKE ${placeholder} OR lower(order_json::text) LIKE ${placeholder} OR lower(coalesce(signer_key_id, '')) LIKE ${placeholder})`);
    }

    values.push(query.limit ?? 20);

    const result = await client.query<{ order_json: StorefrontOrder | string }>(
      `SELECT order_json FROM storefront_orders${conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY created_at DESC, id DESC LIMIT $${values.length}`,
      values
    );

    return result.rows.map((row) => (typeof row.order_json === "string" ? (JSON.parse(row.order_json) as StorefrontOrder) : row.order_json));
  }

  async write(_database: AppDatabase): Promise<void> {
    throw unsupportedPostgresOperation("write()");
  }

  async upsertReplayNonce(input: ConsumeReplayNonceInput): Promise<ReplayNonceRecord["status"]> {
    const client = await this.getClient();
    const result = await client.query<{ status: ReplayNonceRecord["status"] }>(
      [
        "INSERT INTO replay_nonces (id, operation, scope_key, nonce, status, attempts, first_seen_at, last_seen_at, expires_at)",
        "VALUES ($1, $2, $3, $4, $5, 1, $6, $6, $7)",
        "ON CONFLICT (operation, scope_key, nonce)",
        "DO UPDATE SET attempts = replay_nonces.attempts + 1, last_seen_at = EXCLUDED.last_seen_at, status = 'replayed'",
        "RETURNING status"
      ].join(" "),
      [input.id, input.operation, input.scopeKey, input.nonce, input.status, input.seenAt, input.expiresAt]
    );

    return result.rows[0]?.status ?? input.status;
  }

  private extractSignerKeyId(details: Record<string, unknown>): string | null {
    const signerKeyId = details.signerKeyId;

    if (typeof signerKeyId === "string" && signerKeyId.length > 0) {
      return signerKeyId;
    }

    const addon = details.addon;

    if (typeof addon === "object" && addon !== null) {
      const proof = (addon as { proof?: unknown }).proof;

      if (typeof proof === "object" && proof !== null) {
        const keyId = (proof as { keyId?: unknown }).keyId;
        return typeof keyId === "string" && keyId.length > 0 ? keyId : null;
      }
    }

    return null;
  }

  private async getClient(): Promise<PostgresClient> {
    if (!this.clientPromise) {
      this.clientPromise = this.initialize();
    }

    return this.clientPromise;
  }

  private async initialize(): Promise<PostgresClient> {
    const client = await createPostgresClient(this.connectionString);

    await client.query(
      [
        "CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS inventory_snapshots (owner_public_key TEXT PRIMARY KEY, snapshot_json JSONB NOT NULL)",
        "CREATE TABLE IF NOT EXISTS listings (listing_id TEXT PRIMARY KEY, status TEXT NOT NULL, visibility TEXT NOT NULL, name TEXT NOT NULL, sold_count INTEGER NOT NULL, listing_json JSONB NOT NULL)",
        "CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, action TEXT NOT NULL, actor_id TEXT NOT NULL, status TEXT NOT NULL, logged_at TEXT NOT NULL, details_json JSONB NOT NULL, signer_key_id TEXT)",
        "CREATE TABLE IF NOT EXISTS storefront_orders (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL, owner_public_key TEXT NOT NULL, created_at TEXT NOT NULL, signer_key_id TEXT, order_json JSONB NOT NULL)",
        "CREATE TABLE IF NOT EXISTS replay_nonces (id TEXT PRIMARY KEY, operation TEXT NOT NULL, scope_key TEXT NOT NULL, nonce TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, expires_at TEXT NOT NULL, UNIQUE (operation, scope_key, nonce))",
        "CREATE TABLE IF NOT EXISTS wallet_sessions (session_id TEXT PRIMARY KEY, owner_public_key TEXT NOT NULL, status TEXT NOT NULL, issued_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT)",
        "CREATE INDEX IF NOT EXISTS idx_listings_visibility_status_name ON listings(visibility, status, name)",
        "CREATE INDEX IF NOT EXISTS idx_storefront_orders_listing_owner_created_at ON storefront_orders(listing_id, owner_public_key, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_storefront_orders_signer_key_id ON storefront_orders(signer_key_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_events_actor_status ON audit_events(actor_id, status, logged_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_audit_events_action_status ON audit_events(action, status, logged_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_audit_events_signer_key_id ON audit_events(signer_key_id)",
        "CREATE INDEX IF NOT EXISTS idx_replay_nonces_operation_status ON replay_nonces(operation, status, last_seen_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_replay_nonces_scope_nonce ON replay_nonces(scope_key, nonce)",
        "CREATE INDEX IF NOT EXISTS idx_wallet_sessions_owner_status ON wallet_sessions(owner_public_key, status, expires_at DESC)"
      ].join(";")
    );

    return client;
  }
}

class SqliteAppDatabaseAdapter implements AppDatabaseAdapter {
  readonly backend = "sqlite" as const;

  private database: SqliteDatabase | undefined;

  private initializationPromise: Promise<void> | undefined;

  async dispose(): Promise<void> {}

  async runTransaction<T>(work: (transaction: AppDatabaseTransaction) => Promise<T>): Promise<T> {
    const database = await this.getDatabase();
    database.exec("BEGIN IMMEDIATE TRANSACTION");

    const transaction: AppDatabaseTransaction = {
      loadInventorySnapshot: async (ownerPublicKey) => {
        const row = database.prepare("SELECT snapshot_json FROM inventory_snapshots WHERE owner_public_key = ?").get(ownerPublicKey) as
          | { snapshot_json: string }
          | undefined;

        return row ? (JSON.parse(row.snapshot_json) as AddonStoreSnapshot) : undefined;
      },
      saveInventorySnapshot: async (ownerPublicKey, snapshot) => {
        database.prepare("INSERT OR REPLACE INTO inventory_snapshots (owner_public_key, snapshot_json) VALUES (?, ?)").run(ownerPublicKey, JSON.stringify(snapshot));
      },
      clearInventorySnapshot: async (ownerPublicKey) => {
        database.prepare("DELETE FROM inventory_snapshots WHERE owner_public_key = ?").run(ownerPublicKey);
      },
      getStorefrontListing: async (listingId) => {
        const row = database.prepare("SELECT listing_json FROM listings WHERE listing_id = ?").get(listingId) as { listing_json: string } | undefined;
        return row ? (JSON.parse(row.listing_json) as StorefrontListing) : undefined;
      },
      upsertStorefrontListing: async (listing) => {
        database.prepare("INSERT OR REPLACE INTO listings (listing_id, listing_json) VALUES (?, ?)").run(listing.id, JSON.stringify(listing));
      },
      insertStorefrontOrder: async (order) => {
        database.prepare("INSERT INTO storefront_orders (id, created_at, order_json) VALUES (?, ?, ?)").run(order.id, order.createdAt, JSON.stringify(order));
      },
      upsertReplayNonce: async (input) => {
        const existing = database
          .prepare("SELECT id FROM replay_nonces WHERE operation = ? AND scope_key = ? AND nonce = ?")
          .get(input.operation, input.scopeKey, input.nonce) as { id: string } | undefined;

        if (existing) {
          database
            .prepare("UPDATE replay_nonces SET attempts = attempts + 1, last_seen_at = ?, status = 'replayed' WHERE id = ?")
            .run(input.seenAt, existing.id);
          return "replayed";
        }

        database
          .prepare(
            "INSERT INTO replay_nonces (id, operation, scope_key, nonce, status, attempts, first_seen_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)"
          )
          .run(input.id, input.operation, input.scopeKey, input.nonce, input.status, input.seenAt, input.seenAt, input.expiresAt);

        return input.status;
      }
    };

    try {
      const result = await work(transaction);
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  async loadInventorySnapshot(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined> {
    const database = await this.getDatabase();
    const row = database.prepare("SELECT snapshot_json FROM inventory_snapshots WHERE owner_public_key = ?").get(ownerPublicKey) as
      | { snapshot_json: string }
      | undefined;

    return row ? (JSON.parse(row.snapshot_json) as AddonStoreSnapshot) : undefined;
  }

  async saveInventorySnapshot(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void> {
    const database = await this.getDatabase();
    database.prepare("INSERT OR REPLACE INTO inventory_snapshots (owner_public_key, snapshot_json) VALUES (?, ?)").run(ownerPublicKey, JSON.stringify(snapshot));
  }

  async clearInventorySnapshot(ownerPublicKey: string): Promise<void> {
    const database = await this.getDatabase();
    database.prepare("DELETE FROM inventory_snapshots WHERE owner_public_key = ?").run(ownerPublicKey);
  }

  async insertAuditEvent(record: AuditEventRecord): Promise<void> {
    const database = await this.getDatabase();

    database
      .prepare("INSERT INTO audit_events (id, action, actor_id, status, logged_at, details_json) VALUES (?, ?, ?, ?, ?, ?)")
      .run(record.id, record.action, record.actorId, record.status, record.loggedAt, JSON.stringify(record.details));
  }

  async clearAuditEvents(): Promise<void> {
    const database = await this.getDatabase();
    database.prepare("DELETE FROM audit_events").run();
  }

  async read(): Promise<AppDatabase> {
    const database = await this.getDatabase();

    const inventorySnapshots = Object.fromEntries(
      database
        .prepare("SELECT owner_public_key, snapshot_json FROM inventory_snapshots")
        .all()
        .map((row) => [row.owner_public_key as string, JSON.parse(row.snapshot_json as string)])
    );
    const listings = Object.fromEntries(
      database
        .prepare("SELECT listing_id, listing_json FROM listings")
        .all()
        .map((row) => [row.listing_id as string, JSON.parse(row.listing_json as string)])
    );
    const orders = database
      .prepare("SELECT order_json FROM storefront_orders ORDER BY created_at DESC, id DESC")
      .all()
      .map((row) => JSON.parse(row.order_json as string));
    const auditEvents = database
      .prepare("SELECT id, action, actor_id, status, logged_at, details_json FROM audit_events ORDER BY logged_at DESC, id DESC")
      .all()
      .map((row) => ({
        id: row.id as string,
        action: row.action as AppDatabase["auditEvents"][number]["action"],
        actorId: row.actor_id as string,
        status: row.status as AppDatabase["auditEvents"][number]["status"],
        loggedAt: row.logged_at as string,
        details: JSON.parse(row.details_json as string) as Record<string, unknown>
      }));
    const replayNonces = database
      .prepare(
        "SELECT id, operation, scope_key, nonce, status, attempts, first_seen_at, last_seen_at, expires_at FROM replay_nonces ORDER BY last_seen_at DESC, id DESC"
      )
      .all()
      .map((row) => ({
        id: row.id as string,
        operation: row.operation as string,
        scopeKey: row.scope_key as string,
        nonce: row.nonce as string,
        status: row.status as AppDatabase["replayNonces"][number]["status"],
        attempts: row.attempts as number,
        firstSeenAt: row.first_seen_at as string,
        lastSeenAt: row.last_seen_at as string,
        expiresAt: row.expires_at as string
      }));
    const walletSessions = database
      .prepare("SELECT session_id, owner_public_key, status, issued_at, expires_at, revoked_at FROM wallet_sessions ORDER BY issued_at DESC, session_id DESC")
      .all()
      .map((row) => ({
        sessionId: row.session_id as string,
        ownerPublicKey: row.owner_public_key as string,
        status: row.status as WalletSessionRecord["status"],
        issuedAt: row.issued_at as string,
        expiresAt: row.expires_at as string,
        revokedAt: (row.revoked_at as string | null) ?? undefined
      }));

    return {
      inventorySnapshots,
      listings,
      orders,
      auditEvents,
      replayNonces,
      walletSessions
    };
  }

  async queryAuditEvents(query: AuditEventQuery = {}): Promise<AuditEventRecord[]> {
    const database = await this.getDatabase();
    const conditions: string[] = [];
    const values: Array<string | number> = [];
    const normalizedSearch = normalizeSearch(query.search);

    if (query.actorId) {
      conditions.push("actor_id = ?");
      values.push(query.actorId);
    }

    if (query.action) {
      conditions.push("action = ?");
      values.push(query.action);
    }

    if (query.status) {
      conditions.push("status = ?");
      values.push(query.status);
    }

    if (normalizedSearch) {
      conditions.push("(lower(actor_id) LIKE ? OR lower(action) LIKE ? OR lower(status) LIKE ? OR lower(logged_at) LIKE ? OR lower(details_json) LIKE ?)");
      const searchValue = `%${normalizedSearch}%`;
      values.push(searchValue, searchValue, searchValue, searchValue, searchValue);
    }

    values.push(query.limit ?? 20);
    const statement = database.prepare(
      `SELECT id, action, actor_id, status, logged_at, details_json FROM audit_events${conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY logged_at DESC, id DESC LIMIT ?`
    );

    return statement.all(...values).map((row) => ({
      id: row.id as string,
      action: row.action as AuditEventRecord["action"],
      actorId: row.actor_id as string,
      status: row.status as AuditEventRecord["status"],
      loggedAt: row.logged_at as string,
      details: JSON.parse(row.details_json as string) as Record<string, unknown>
    }));
  }

  async clearReplayNonces(): Promise<void> {
    const database = await this.getDatabase();
    database.prepare("DELETE FROM replay_nonces").run();
  }

  async queryReplayNonces(query: ReplayNonceQuery = {}): Promise<ReplayNonceRecord[]> {
    const database = await this.getDatabase();
    const conditions: string[] = [];
    const values: Array<string | number> = [];
    const normalizedSearch = normalizeSearch(query.search);

    if (query.operation) {
      conditions.push("operation = ?");
      values.push(query.operation);
    }

    if (query.scopeKey) {
      conditions.push("scope_key = ?");
      values.push(query.scopeKey);
    }

    if (query.status) {
      conditions.push("status = ?");
      values.push(query.status);
    }

    if (normalizedSearch) {
      conditions.push("(lower(operation) LIKE ? OR lower(scope_key) LIKE ? OR lower(nonce) LIKE ? OR lower(status) LIKE ? OR lower(last_seen_at) LIKE ?)");
      const searchValue = `%${normalizedSearch}%`;
      values.push(searchValue, searchValue, searchValue, searchValue, searchValue);
    }

    values.push(query.limit ?? 20);
    const statement = database.prepare(
      `SELECT id, operation, scope_key, nonce, status, attempts, first_seen_at, last_seen_at, expires_at FROM replay_nonces${conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY last_seen_at DESC, id DESC LIMIT ?`
    );

    return statement.all(...values).map((row) => ({
      id: row.id as string,
      operation: row.operation as string,
      scopeKey: row.scope_key as string,
      nonce: row.nonce as string,
      status: row.status as ReplayNonceRecord["status"],
      attempts: row.attempts as number,
      firstSeenAt: row.first_seen_at as string,
      lastSeenAt: row.last_seen_at as string,
      expiresAt: row.expires_at as string
    }));
  }

  async upsertWalletSession(record: WalletSessionRecord): Promise<void> {
    const database = await this.getDatabase();

    database
      .prepare(
        "INSERT OR REPLACE INTO wallet_sessions (session_id, owner_public_key, status, issued_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(record.sessionId, record.ownerPublicKey, record.status, record.issuedAt, record.expiresAt, record.revokedAt ?? null);
  }

  async getWalletSession(sessionId: string): Promise<WalletSessionRecord | undefined> {
    const database = await this.getDatabase();
    const row = database
      .prepare("SELECT session_id, owner_public_key, status, issued_at, expires_at, revoked_at FROM wallet_sessions WHERE session_id = ?")
      .get(sessionId) as
      | {
          session_id: string;
          owner_public_key: string;
          status: WalletSessionRecord["status"];
          issued_at: string;
          expires_at: string;
          revoked_at: string | null;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      sessionId: row.session_id,
      ownerPublicKey: row.owner_public_key,
      status: row.status,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at ?? undefined
    };
  }

  async revokeWalletSession(sessionId: string, revokedAt: string): Promise<boolean> {
    const database = await this.getDatabase();
    const result = database
      .prepare("UPDATE wallet_sessions SET status = 'revoked', revoked_at = ? WHERE session_id = ? AND status <> 'revoked'")
      .run(revokedAt, sessionId);

    return Number(result.changes ?? 0) > 0;
  }

  async clearWalletSessions(): Promise<void> {
    const database = await this.getDatabase();
    database.prepare("DELETE FROM wallet_sessions").run();
  }

  async listStorefrontListings(query: StorefrontListingQuery = {}): Promise<StorefrontListing[]> {
    const database = await this.getDatabase();
    const values: string[] = [];
    const whereClause = query.includeHidden
      ? ""
      : (() => {
          values.push("public");
          return " WHERE json_extract(listing_json, '$.visibility') = ?";
        })();

    return database
      .prepare(`SELECT listing_json FROM listings${whereClause} ORDER BY json_extract(listing_json, '$.status') ASC, json_extract(listing_json, '$.name') ASC`)
      .all(...values)
      .map((row) => JSON.parse(row.listing_json as string) as StorefrontListing)
      .sort(sortStorefrontListings);
  }

  async getStorefrontListing(listingId: string): Promise<StorefrontListing | undefined> {
    const database = await this.getDatabase();
    const row = database.prepare("SELECT listing_json FROM listings WHERE listing_id = ?").get(listingId) as { listing_json: string } | undefined;

    return row ? (JSON.parse(row.listing_json) as StorefrontListing) : undefined;
  }

  async upsertStorefrontListing(listing: StorefrontListing): Promise<void> {
    const database = await this.getDatabase();
    database.prepare("INSERT OR REPLACE INTO listings (listing_id, listing_json) VALUES (?, ?)").run(listing.id, JSON.stringify(listing));
  }

  async insertStorefrontOrder(order: StorefrontOrder): Promise<void> {
    const database = await this.getDatabase();

    database.prepare("INSERT INTO storefront_orders (id, created_at, order_json) VALUES (?, ?, ?)").run(order.id, order.createdAt, JSON.stringify(order));
  }

  async queryStorefrontOrders(query: StorefrontOrderQuery = {}): Promise<StorefrontOrder[]> {
    const database = await this.getDatabase();
    const conditions: string[] = [];
    const values: Array<string | number> = [];
    const normalizedSearch = normalizeSearch(query.search);

    if (query.listingId) {
      conditions.push("json_extract(order_json, '$.listingId') = ?");
      values.push(query.listingId);
    }

    if (query.ownerPublicKey) {
      conditions.push("json_extract(order_json, '$.ownerPublicKey') = ?");
      values.push(query.ownerPublicKey);
    }

    if (normalizedSearch) {
      conditions.push("(lower(id) LIKE ? OR lower(order_json) LIKE ?)");
      const searchValue = `%${normalizedSearch}%`;
      values.push(searchValue, searchValue);
    }

    values.push(query.limit ?? 20);
    const statement = database.prepare(
      `SELECT order_json FROM storefront_orders${conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY created_at DESC, id DESC LIMIT ?`
    );

    return statement.all(...values).map((row) => JSON.parse(row.order_json as string) as StorefrontOrder);
  }

  async write(appDatabase: AppDatabase): Promise<void> {
    const database = await this.getDatabase();

    this.replaceAll(database, appDatabase);
  }

  async upsertReplayNonce(input: ConsumeReplayNonceInput): Promise<ReplayNonceRecord["status"]> {
    const database = await this.getDatabase();

    // Check whether this nonce has been seen before within a single transaction so
    // the read-then-write is atomic at the database level.
    database.exec("BEGIN IMMEDIATE TRANSACTION");

    try {
      const existing = database
        .prepare("SELECT id, attempts FROM replay_nonces WHERE operation = ? AND scope_key = ? AND nonce = ?")
        .get(input.operation, input.scopeKey, input.nonce) as { id: string; attempts: number } | undefined;

      if (existing) {
        database
          .prepare("UPDATE replay_nonces SET attempts = attempts + 1, last_seen_at = ?, status = 'replayed' WHERE id = ?")
          .run(input.seenAt, existing.id);
        database.exec("COMMIT");
        return "replayed";
      }

      database
        .prepare(
          "INSERT INTO replay_nonces (id, operation, scope_key, nonce, status, attempts, first_seen_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)"
        )
        .run(input.id, input.operation, input.scopeKey, input.nonce, input.status, input.seenAt, input.seenAt, input.expiresAt);
      database.exec("COMMIT");
      return input.status;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  private replaceAll(database: SqliteDatabase, appDatabase: AppDatabase): void {
    database.exec("BEGIN IMMEDIATE TRANSACTION");

    try {
      database.exec(
        [
          "DELETE FROM inventory_snapshots",
          "DELETE FROM listings",
          "DELETE FROM storefront_orders",
          "DELETE FROM audit_events",
          "DELETE FROM replay_nonces",
          "DELETE FROM wallet_sessions"
        ].join(";")
      );

      const insertInventory = database.prepare("INSERT INTO inventory_snapshots (owner_public_key, snapshot_json) VALUES (?, ?)");
      for (const [ownerPublicKey, snapshot] of Object.entries(appDatabase.inventorySnapshots)) {
        insertInventory.run(ownerPublicKey, JSON.stringify(snapshot));
      }

      const insertListing = database.prepare("INSERT INTO listings (listing_id, listing_json) VALUES (?, ?)");
      for (const [listingId, listing] of Object.entries(appDatabase.listings)) {
        insertListing.run(listingId, JSON.stringify(listing));
      }

      const insertOrder = database.prepare("INSERT INTO storefront_orders (id, created_at, order_json) VALUES (?, ?, ?)");
      for (const order of appDatabase.orders) {
        insertOrder.run(order.id, order.createdAt, JSON.stringify(order));
      }

      const insertAudit = database.prepare(
        "INSERT INTO audit_events (id, action, actor_id, status, logged_at, details_json) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const event of appDatabase.auditEvents) {
        insertAudit.run(event.id, event.action, event.actorId, event.status, event.loggedAt, JSON.stringify(event.details));
      }

      const insertReplay = database.prepare(
        "INSERT INTO replay_nonces (id, operation, scope_key, nonce, status, attempts, first_seen_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const record of appDatabase.replayNonces) {
        insertReplay.run(
          record.id,
          record.operation,
          record.scopeKey,
          record.nonce,
          record.status,
          record.attempts,
          record.firstSeenAt,
          record.lastSeenAt,
          record.expiresAt
        );
      }

      const insertWalletSession = database.prepare(
        "INSERT INTO wallet_sessions (session_id, owner_public_key, status, issued_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const session of appDatabase.walletSessions) {
        insertWalletSession.run(
          session.sessionId,
          session.ownerPublicKey,
          session.status,
          session.issuedAt,
          session.expiresAt,
          session.revokedAt ?? null
        );
      }

      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  private async getDatabase(): Promise<SqliteDatabase> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize();
    }

    await this.initializationPromise;

    if (!this.database) {
      throw new Error("App database adapter did not initialize.");
    }

    return this.database;
  }

  private async initialize(): Promise<void> {
    const dataDirectoryPath = getDataDirectoryPath();
    await mkdir(dataDirectoryPath, { recursive: true });

    const { DatabaseSync } = await import(/* @vite-ignore */ "node:sqlite");
    const database = new DatabaseSync(getSqlitePath());
    database.exec("PRAGMA journal_mode = WAL");
    database.exec("PRAGMA foreign_keys = ON");
    database.exec(
      [
        "CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS inventory_snapshots (owner_public_key TEXT PRIMARY KEY, snapshot_json TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS listings (listing_id TEXT PRIMARY KEY, listing_json TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS storefront_orders (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, order_json TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, action TEXT NOT NULL, actor_id TEXT NOT NULL, status TEXT NOT NULL, logged_at TEXT NOT NULL, details_json TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS replay_nonces (id TEXT PRIMARY KEY, operation TEXT NOT NULL, scope_key TEXT NOT NULL, nonce TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS wallet_sessions (session_id TEXT PRIMARY KEY, owner_public_key TEXT NOT NULL, status TEXT NOT NULL, issued_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT)",
        "CREATE INDEX IF NOT EXISTS idx_storefront_orders_created_at ON storefront_orders(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_audit_events_actor_status ON audit_events(actor_id, status, logged_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_audit_events_action_status ON audit_events(action, status, logged_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_replay_nonces_operation_status ON replay_nonces(operation, status, last_seen_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_replay_nonces_scope_nonce ON replay_nonces(scope_key, nonce)",
        "CREATE INDEX IF NOT EXISTS idx_wallet_sessions_owner_status ON wallet_sessions(owner_public_key, status, expires_at DESC)"
      ].join(";")
    );

    const schemaVersion = database.prepare("SELECT value FROM app_meta WHERE key = ?").get("schema_version") as { value?: string } | undefined;

    if (!schemaVersion) {
      const legacyDatabase = await this.loadLegacyJsonDatabase();

      if (legacyDatabase) {
        this.replaceAll(database, legacyDatabase);
      }

      database.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)").run("schema_version", "1");
    }

    this.database = database;
  }

  private async loadLegacyJsonDatabase(): Promise<AppDatabase | undefined> {
    try {
      const legacyJsonPath = getLegacyJsonPath();
      await access(legacyJsonPath, fsConstants.F_OK);
      const raw = await readFile(legacyJsonPath, "utf8");
      return normalizeAppDatabase(JSON.parse(raw) as Partial<AppDatabase>);
    } catch {
      return undefined;
    }
  }
}

let appDatabaseAdapter: AppDatabaseAdapter | undefined;

export function createAppDatabaseAdapter(
  source: Record<string, string | undefined> = process.env,
  options: CreateAppDatabaseAdapterOptions = {}
): AppDatabaseAdapter {
  const env = parseServerEnv(source);

  if ((options.preferJsonFileInVitest ?? true) && source.VITEST && env.APP_DATABASE_BACKEND !== "postgres") {
    return new JsonFileAppDatabaseAdapter();
  }

  if (env.APP_DATABASE_BACKEND === "postgres") {
    if (!env.APP_DATABASE_URL) {
      throw new Error("APP_DATABASE_URL is required when APP_DATABASE_BACKEND=postgres.");
    }

    return new PostgresAppDatabaseAdapter(env.APP_DATABASE_URL);
  }

  return new SqliteAppDatabaseAdapter();
}

export function getAppDatabaseAdapter(): AppDatabaseAdapter {
  appDatabaseAdapter ??= createAppDatabaseAdapter();
  return appDatabaseAdapter;
}

export async function runAppDatabaseTransaction<T>(work: (transaction: AppDatabaseTransaction) => Promise<T>): Promise<T> {
  return getAppDatabaseAdapter().runTransaction(work);
}

export function resetAppDatabaseAdapterForTests(): void {
  appDatabaseAdapter = undefined;
}

export async function disposeAppDatabaseAdapterForTests(): Promise<void> {
  if (!appDatabaseAdapter) {
    return;
  }

  await appDatabaseAdapter.dispose();
  appDatabaseAdapter = undefined;
}
