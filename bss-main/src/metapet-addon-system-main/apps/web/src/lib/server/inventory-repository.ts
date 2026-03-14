import type { Addon } from "@bluesnake-studios/addon-core";
import { createFutureDatabaseAdapter, type AddonStoreSnapshot } from "@bluesnake-studios/addon-store";

import { getAppDatabaseAdapter, type AppDatabaseTransaction } from "@/lib/server/app-database-adapter";

type InventoryPersistenceStore = Pick<AppDatabaseTransaction, "loadInventorySnapshot" | "saveInventorySnapshot" | "clearInventorySnapshot">;

const ownerCriticalSections = new Map<string, Promise<void>>();

async function runWithinOwnerCriticalSection<T>(ownerPublicKey: string, mutate: () => Promise<T>): Promise<T> {
  const activeSection = ownerCriticalSections.get(ownerPublicKey) ?? Promise.resolve();
  let releaseSection: (() => void) | undefined;

  const queuedSection = activeSection.then(
    () =>
      new Promise<void>((resolve) => {
        releaseSection = resolve;
      })
  );

  ownerCriticalSections.set(ownerPublicKey, queuedSection);
  await activeSection;

  try {
    return await mutate();
  } finally {
    releaseSection?.();

    if (ownerCriticalSections.get(ownerPublicKey) === queuedSection) {
      ownerCriticalSections.delete(ownerPublicKey);
    }
  }
}

async function runWithinOwnerCriticalSections<T>(ownerPublicKeys: string[], mutate: () => Promise<T>): Promise<T> {
  const orderedOwnerKeys = [...new Set(ownerPublicKeys)].sort((left, right) => left.localeCompare(right));

  if (orderedOwnerKeys.length === 0) {
    return mutate();
  }

  const runAtIndex = async (index: number): Promise<T> => {
    if (index >= orderedOwnerKeys.length) {
      return mutate();
    }

    const ownerPublicKey = orderedOwnerKeys[index];

    if (!ownerPublicKey) {
      return mutate();
    }

    return runWithinOwnerCriticalSection(ownerPublicKey, () => runAtIndex(index + 1));
  };

  return runAtIndex(0);
}

async function updateInventorySnapshotsAtomic<T>(
  ownerPublicKeys: string[],
  mutate: (snapshots: Record<string, AddonStoreSnapshot | undefined>) => T | Promise<T>,
  storage: InventoryPersistenceStore = getAppDatabaseAdapter()
): Promise<T> {
  return runWithinOwnerCriticalSections(ownerPublicKeys, async () => {
    const snapshots = Object.fromEntries(
      await Promise.all(ownerPublicKeys.map(async (ownerPublicKey) => [ownerPublicKey, await storage.loadInventorySnapshot(ownerPublicKey)] as const))
    );
    const result = await mutate(snapshots);

    for (const ownerPublicKey of ownerPublicKeys) {
      const snapshot = snapshots[ownerPublicKey];

      if (!snapshot) {
        await storage.clearInventorySnapshot(ownerPublicKey);
        continue;
      }

      await storage.saveInventorySnapshot(ownerPublicKey, snapshot);
    }

    return result;
  });
}

const inventoryPersistence = createFutureDatabaseAdapter({
  async load(ownerPublicKey) {
    return getAppDatabaseAdapter().loadInventorySnapshot(ownerPublicKey);
  },
  async save(ownerPublicKey, snapshot) {
    await getAppDatabaseAdapter().saveInventorySnapshot(ownerPublicKey, snapshot);
  },
  async clear(ownerPublicKey) {
    await getAppDatabaseAdapter().clearInventorySnapshot(ownerPublicKey);
  }
});

export async function loadInventorySnapshot(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined> {
  return inventoryPersistence.load(ownerPublicKey);
}

export async function saveInventorySnapshot(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void> {
  await inventoryPersistence.save(ownerPublicKey, snapshot);
}

export async function clearInventorySnapshot(ownerPublicKey: string): Promise<void> {
  await inventoryPersistence.clear(ownerPublicKey);
}

export async function appendOwnedAddon(ownerPublicKey: string, addon: Addon, storage?: InventoryPersistenceStore): Promise<void> {
  await updateInventorySnapshotsAtomic([ownerPublicKey], (snapshots) => {
    const snapshot =
      snapshots[ownerPublicKey] ??
      {
        ownerPublicKey,
        addons: {},
        equippedByCategory: {}
      };

    snapshot.addons[addon.id] = addon;
    snapshots[ownerPublicKey] = snapshot;
  }, storage);
}

export async function transferOwnedAddon(
  addonId: string,
  fromOwnerPublicKey: string,
  toOwnerPublicKey: string,
  storage?: InventoryPersistenceStore
): Promise<boolean> {
  return updateInventorySnapshotsAtomic([fromOwnerPublicKey, toOwnerPublicKey], (snapshots) => {
    const source = snapshots[fromOwnerPublicKey];

    if (!source) {
      return false;
    }

    const addon = source.addons[addonId];

    if (!addon) {
      return false;
    }

    delete source.addons[addonId];
    if (source.equippedByCategory[addon.category] === addonId) {
      source.equippedByCategory[addon.category] = undefined;
    }

    const destination =
      snapshots[toOwnerPublicKey] ??
      {
        ownerPublicKey: toOwnerPublicKey,
        addons: {},
        equippedByCategory: {}
      };

    destination.addons[addon.id] = {
      ...addon,
      ownerPublicKey: toOwnerPublicKey,
      equipped: false,
        equippedAt: undefined
      };

    snapshots[fromOwnerPublicKey] = source;
    snapshots[toOwnerPublicKey] = destination;

    return true;
  }, storage);
}
