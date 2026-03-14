"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { parseWebEnv } from "@bluesnake-studios/config";

import { getAddonStore } from "@/lib/client/store";

const webEnv = parseWebEnv({
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_DEFAULT_OWNER_PUBLIC_KEY: process.env.NEXT_PUBLIC_DEFAULT_OWNER_PUBLIC_KEY,
  NEXT_PUBLIC_MOSS60_SHARE_BASE_URL: process.env.NEXT_PUBLIC_MOSS60_SHARE_BASE_URL
});

const AddonStoreContext = createContext<ReturnType<typeof getAddonStore> | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const store = useMemo(() => getAddonStore(webEnv.NEXT_PUBLIC_DEFAULT_OWNER_PUBLIC_KEY), []);

  useEffect(() => {
    void store.getState().hydrate();
  }, [store]);

  return <AddonStoreContext.Provider value={store}>{children}</AddonStoreContext.Provider>;
}

export function useAddonStoreContext() {
  const context = useContext(AddonStoreContext);

  if (!context) {
    throw new Error("Addon store context is not available.");
  }

  return context;
}
