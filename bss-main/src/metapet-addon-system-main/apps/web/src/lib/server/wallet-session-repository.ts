import { getAppDatabaseAdapter } from "@/lib/server/app-database-adapter";
import type { WalletSessionRecord } from "@/lib/server/operations-store";

export async function persistWalletSession(record: WalletSessionRecord): Promise<void> {
  await getAppDatabaseAdapter().upsertWalletSession(record);
}

export async function getWalletSessionRecord(sessionId: string): Promise<WalletSessionRecord | undefined> {
  return getAppDatabaseAdapter().getWalletSession(sessionId);
}

export async function revokeWalletSessionRecord(sessionId: string, revokedAt: string): Promise<boolean> {
  return getAppDatabaseAdapter().revokeWalletSession(sessionId, revokedAt);
}

export async function clearWalletSessionRecords(): Promise<void> {
  await getAppDatabaseAdapter().clearWalletSessions();
}
