import type { AddonStorePersistence, AddonStoreSnapshot } from "@bluesnake-studios/addon-store";

import { clearInventorySnapshot, loadInventorySnapshot, saveInventorySnapshot } from "@/lib/client/web-api";

export function createApiInventoryPersistence(): AddonStorePersistence {
  return {
    async load(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined> {
      return loadInventorySnapshot(ownerPublicKey);
    },
    async save(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void> {
      await saveInventorySnapshot(ownerPublicKey, snapshot);
    },
    async clear(ownerPublicKey: string): Promise<void> {
      await clearInventorySnapshot(ownerPublicKey);
    }
  };
}
