import type { AddonStoreSnapshot } from "@bluesnake-studios/addon-store";

import type { AuditEventRecord, ReplayNonceRecord, WalletSessionRecord } from "@/lib/server/operations-store";
import type { StorefrontListing, StorefrontOrder } from "@/lib/storefront/types";

export interface AppDatabase {
  inventorySnapshots: Record<string, AddonStoreSnapshot>;
  listings: Record<string, StorefrontListing>;
  orders: StorefrontOrder[];
  auditEvents: AuditEventRecord[];
  replayNonces: ReplayNonceRecord[];
  walletSessions: WalletSessionRecord[];
}

export function createEmptyAppDatabase(): AppDatabase {
  return {
    inventorySnapshots: {},
    listings: {},
    orders: [],
    auditEvents: [],
    replayNonces: [],
    walletSessions: []
  };
}

export function normalizeAppDatabase(parsed: Partial<AppDatabase>): AppDatabase {
  return {
    inventorySnapshots: parsed.inventorySnapshots ?? {},
    listings: parsed.listings ?? {},
    orders: parsed.orders ?? [],
    auditEvents: parsed.auditEvents ?? [],
    replayNonces: parsed.replayNonces ?? [],
    walletSessions: parsed.walletSessions ?? []
  };
}
