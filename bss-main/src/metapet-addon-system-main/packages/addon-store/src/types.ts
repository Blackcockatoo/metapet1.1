import type { Addon, AddonCategory } from "@bluesnake-studios/addon-core";

export interface AddonStoreSnapshot {
  ownerPublicKey: string;
  addons: Record<string, Addon>;
  equippedByCategory: Partial<Record<AddonCategory, string>>;
}

export interface AddonStorePersistence {
  load(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined> | AddonStoreSnapshot | undefined;
  save(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void> | void;
  clear(ownerPublicKey: string): Promise<void> | void;
}

export type AddonVerifier = (addon: Addon) => Promise<boolean> | boolean;

export interface InitializeAddonStoreOptions {
  verifier?: AddonVerifier;
  persistence?: AddonStorePersistence;
}

export interface AddonStoreState extends AddonStoreSnapshot {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addAddon: (addon: Addon) => Promise<void>;
  equipAddon: (addonId: string) => Promise<void>;
  unequipAddon: (category: AddonCategory) => Promise<void>;
  transferAddon: (addonId: string, nextOwnerPublicKey: string) => Promise<void>;
  receiveAddon: (addon: Addon) => Promise<void>;
  reset: () => Promise<void>;
}
