import { initializeAddonStore } from "@bluesnake-studios/addon-store";

import { formatDebugError } from "@/lib/client/api-error";
import { verifyAddon } from "@/lib/client/addon-verifier";
import { createApiInventoryPersistence } from "@/lib/client/api-inventory-persistence";

const stores = new Map<string, ReturnType<typeof initializeAddonStore>>();

export function getAddonStore(ownerPublicKey: string) {
  const existingStore = stores.get(ownerPublicKey);

  if (existingStore) {
    return existingStore;
  }

  const persistence = createApiInventoryPersistence();
  const store = initializeAddonStore(ownerPublicKey, {
    verifier: async (addon) => {
      try {
        return await verifyAddon(addon);
      } catch (error) {
        throw new Error(`Verifier request failed: ${formatDebugError(error)}`);
      }
    },
    persistence: {
      load: async (ownerKey) => {
        try {
          return await persistence.load(ownerKey);
        } catch (error) {
          throw new Error(`Inventory load failed: ${formatDebugError(error)}`);
        }
      },
      save: async (ownerKey, snapshot) => {
        try {
          await persistence.save(ownerKey, snapshot);
        } catch (error) {
          throw new Error(`Inventory save failed: ${formatDebugError(error)}`);
        }
      },
      clear: async (ownerKey) => {
        try {
          await persistence.clear(ownerKey);
        } catch (error) {
          throw new Error(`Inventory clear failed: ${formatDebugError(error)}`);
        }
      }
    }
  });

  stores.set(ownerPublicKey, store);

  return store;
}
