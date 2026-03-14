import type { AddonStorePersistence, AddonStoreSnapshot } from "./types";

export function createMemoryPersistence(seed?: AddonStoreSnapshot): AddonStorePersistence {
  let snapshot = seed;

  return {
    load() {
      return snapshot;
    },
    save(_ownerPublicKey, nextSnapshot) {
      snapshot = nextSnapshot;
    },
    clear() {
      snapshot = undefined;
    }
  };
}
