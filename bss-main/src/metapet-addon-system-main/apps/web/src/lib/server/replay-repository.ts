import { getAppDatabaseAdapter, type AppDatabaseTransaction } from "@/lib/server/app-database-adapter";
import type { ReplayNonceRecord } from "@/lib/server/operations-store";

type ReplayPersistenceStore = Pick<AppDatabaseTransaction, "upsertReplayNonce">;

const replayRetentionMs = 7 * 24 * 60 * 60 * 1000;

export interface ConsumeReplayNonceInput {
  operation: string;
  scopeKey: string;
  nonce: string;
  timestampMs: number;
  ttlMs: number;
  nowMs?: number;
}

export interface ReplayNonceQuery {
  limit?: number;
  operation?: string;
  search?: string;
  scopeKey?: string;
  status?: ReplayNonceRecord["status"];
}

function sortReplayRecords(left: ReplayNonceRecord, right: ReplayNonceRecord): number {
  return right.lastSeenAt.localeCompare(left.lastSeenAt);
}

function pruneReplayRecords(records: ReplayNonceRecord[], nowMs: number): ReplayNonceRecord[] {
  return records.filter((record) => new Date(record.expiresAt).getTime() + replayRetentionMs > nowMs);
}

export async function consumeReplayNonce(
  input: ConsumeReplayNonceInput,
  storage: ReplayPersistenceStore = getAppDatabaseAdapter()
): Promise<ReplayNonceRecord["status"]> {
  const nowMs = input.nowMs ?? Date.now();
  const seenAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(input.timestampMs + input.ttlMs).toISOString();
  const status: ReplayNonceRecord["status"] = input.timestampMs + input.ttlMs <= nowMs ? "expired" : "accepted";

  // Delegate to the adapter's atomic upsert.  For SQLite this runs inside a single
  // BEGIN IMMEDIATE transaction so it is safe under concurrent requests.  For the
  // JSON-file adapter (used in tests) it falls back to the memory-based approach.
  return storage.upsertReplayNonce({
    id: `replay-${crypto.randomUUID()}`,
    operation: input.operation,
    scopeKey: input.scopeKey,
    nonce: input.nonce,
    status,
    seenAt,
    expiresAt
  });
}

export async function listReplayNonceRecords(query: ReplayNonceQuery = {}): Promise<ReplayNonceRecord[]> {
  const records = await getAppDatabaseAdapter().queryReplayNonces(query);
  return pruneReplayRecords(records, Date.now()).sort(sortReplayRecords).slice(0, query.limit ?? 20);
}

export async function clearReplayNonceRecords(): Promise<void> {
  await getAppDatabaseAdapter().clearReplayNonces();
}
