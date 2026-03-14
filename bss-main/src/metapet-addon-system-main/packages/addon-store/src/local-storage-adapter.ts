import type { AddonStorePersistence, AddonStoreSnapshot } from "./types";

function getStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

export function createLocalStorageAdapter(storageKey: string): AddonStorePersistence {
  return {
    load(ownerPublicKey) {
      const storage = getStorage();

      if (!storage) {
        return undefined;
      }

      const rawValue = storage.getItem(`${storageKey}:${ownerPublicKey}`);

      if (!rawValue) {
        return undefined;
      }

      return JSON.parse(rawValue) as AddonStoreSnapshot;
    },
    save(ownerPublicKey, snapshot) {
      const storage = getStorage();

      if (!storage) {
        return;
      }

      storage.setItem(`${storageKey}:${ownerPublicKey}`, JSON.stringify(snapshot));
    },
    clear(ownerPublicKey) {
      const storage = getStorage();

      if (!storage) {
        return;
      }

      storage.removeItem(`${storageKey}:${ownerPublicKey}`);
    }
  };
}
