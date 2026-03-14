import type { Addon, AddonCategory } from "@bluesnake-studios/addon-core";

import type { AddonStoreSnapshot } from "./types";

export function selectAddons(snapshot: AddonStoreSnapshot): Addon[] {
  return Object.values(snapshot.addons);
}

export function selectAddonById(snapshot: AddonStoreSnapshot, addonId: string): Addon | undefined {
  return snapshot.addons[addonId];
}

export function selectEquippedAddons(snapshot: AddonStoreSnapshot): Addon[] {
  return Object.values(snapshot.equippedByCategory)
    .map((addonId) => (addonId ? snapshot.addons[addonId] : undefined))
    .filter((addon): addon is Addon => Boolean(addon));
}

export function selectAddonsByCategory(snapshot: AddonStoreSnapshot, category: AddonCategory): Addon[] {
  return selectAddons(snapshot).filter((addon) => addon.category === category);
}
