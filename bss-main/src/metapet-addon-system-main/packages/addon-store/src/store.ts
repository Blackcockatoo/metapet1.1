import type { Addon, AddonCategory } from "@bluesnake-studios/addon-core";
import { createStore } from "zustand/vanilla";

import type { AddonStoreSnapshot, AddonStoreState, InitializeAddonStoreOptions } from "./types";

function createDefaultVerifier() {
  return async () => {
    throw new Error("Addon verifier required before ingesting addons into the store.");
  };
}

function snapshotFromState(state: AddonStoreState): AddonStoreSnapshot {
  return {
    ownerPublicKey: state.ownerPublicKey,
    addons: state.addons,
    equippedByCategory: state.equippedByCategory
  };
}

export function initializeAddonStore(ownerPublicKey: string, options: InitializeAddonStoreOptions = {}) {
  const verifier = options.verifier ?? createDefaultVerifier();

  const store = createStore<AddonStoreState>((set, get) => {
    const persist = async () => {
      if (!options.persistence) {
        return;
      }

      await options.persistence.save(ownerPublicKey, snapshotFromState(get()));
    };

    const ingestAddon = async (addon: Addon) => {
      if (!(await verifier(addon))) {
        throw new Error(`Addon verification failed for ${addon.id}.`);
      }

      set((state) => ({
        addons: {
          ...state.addons,
          [addon.id]: addon
        }
      }));

      await persist();
    };

    return {
      ownerPublicKey,
      addons: {},
      equippedByCategory: {},
      hydrated: false,
      async hydrate() {
        if (!options.persistence) {
          set({ hydrated: true });
          return;
        }

        const snapshot = await options.persistence.load(ownerPublicKey);

        if (snapshot) {
          set({
            ownerPublicKey: snapshot.ownerPublicKey,
            addons: snapshot.addons,
            equippedByCategory: snapshot.equippedByCategory,
            hydrated: true
          });
          return;
        }

        set({ hydrated: true });
      },
      async addAddon(addon: Addon) {
        await ingestAddon(addon);
      },
      async equipAddon(addonId: string) {
        const addon = get().addons[addonId];

        if (!addon) {
          throw new Error(`Unknown addon: ${addonId}`);
        }

        const previouslyEquippedId = get().equippedByCategory[addon.category];

        if (previouslyEquippedId && previouslyEquippedId !== addon.id) {
          const previousAddon = get().addons[previouslyEquippedId];

          if (previousAddon) {
            set((state: AddonStoreState) => ({
              addons: {
                ...state.addons,
                [previousAddon.id]: {
                  ...previousAddon,
                  equipped: false,
                  equippedAt: undefined
                }
              }
            }));
          }
        }

        set((state: AddonStoreState) => ({
          addons: {
            ...state.addons,
            [addon.id]: {
              ...addon,
              equipped: true,
              equippedAt: new Date().toISOString()
            }
          },
          equippedByCategory: {
            ...state.equippedByCategory,
            [addon.category]: addon.id
          }
        }));

        await persist();
      },
      async unequipAddon(category: AddonCategory) {
        const addonId = get().equippedByCategory[category];

        if (!addonId) {
          return;
        }

        const addon = get().addons[addonId];

        if (!addon) {
          return;
        }

        set((state: AddonStoreState) => ({
          addons: {
            ...state.addons,
            [addon.id]: {
              ...addon,
              equipped: false,
              equippedAt: undefined
            }
          },
          equippedByCategory: {
            ...state.equippedByCategory,
            [category]: undefined
          }
        }));

        await persist();
      },
      async transferAddon(addonId: string, nextOwnerPublicKey: string) {
        const addon = get().addons[addonId];

        if (!addon) {
          throw new Error(`Unknown addon: ${addonId}`);
        }

        if (nextOwnerPublicKey === ownerPublicKey) {
          return;
        }

        set((state: AddonStoreState) => {
          const nextAddons = { ...state.addons };
          delete nextAddons[addonId];

          return {
            addons: nextAddons,
            equippedByCategory: {
              ...state.equippedByCategory,
              [addon.category]: state.equippedByCategory[addon.category] === addonId ? undefined : state.equippedByCategory[addon.category]
            }
          };
        });

        await persist();
      },
      async receiveAddon(addon: Addon) {
        await ingestAddon(addon);
      },
      async reset() {
        set({
          ownerPublicKey,
          addons: {},
          equippedByCategory: {},
          hydrated: true
        });

        if (options.persistence) {
          await options.persistence.clear(ownerPublicKey);
        }
      }
    };
  });

  return store;
}
