"use client";

import type { AddonStoreState } from "@bluesnake-studios/addon-store";
import { useStore } from "zustand";

import { useAddonStoreContext } from "@/providers/app-providers";

export function useAddonStore<T>(selector: (state: AddonStoreState) => T): T {
  const store = useAddonStoreContext();
  return useStore(store, selector);
}
