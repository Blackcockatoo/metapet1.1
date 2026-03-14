import type { AddonStorePersistence, AddonStoreSnapshot } from "./types";

export interface AddonStoreDatabaseDriver {
  load(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined> | AddonStoreSnapshot | undefined;
  save(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void> | void;
  clear(ownerPublicKey: string): Promise<void> | void;
}

export function createInMemoryDatabaseDriver(seed: AddonStoreSnapshot[] = []): AddonStoreDatabaseDriver {
  const snapshots = new Map(seed.map((snapshot) => [snapshot.ownerPublicKey, snapshot]));

  return {
    load(ownerPublicKey) {
      return snapshots.get(ownerPublicKey);
    },
    save(ownerPublicKey, snapshot) {
      snapshots.set(ownerPublicKey, snapshot);
    },
    clear(ownerPublicKey) {
      snapshots.delete(ownerPublicKey);
    }
  };
}

export function createFutureDatabaseAdapter(driver: AddonStoreDatabaseDriver = createInMemoryDatabaseDriver()): AddonStorePersistence {
  return {
    async load(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined> {
      return driver.load(ownerPublicKey);
    },
    async save(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void> {
      await driver.save(ownerPublicKey, snapshot);
    },
    async clear(ownerPublicKey: string): Promise<void> {
      await driver.clear(ownerPublicKey);
    }
  };
}
