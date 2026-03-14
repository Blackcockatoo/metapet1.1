export const featureFlags = {
  adminRoutes: true,
  clientInventoryPersistence: true,
  directWalletTransfers: true,
  moss60ShareLinks: true,
  serverSideMinting: false,
  transferDrafts: true
} as const;

export type FeatureFlags = typeof featureFlags;
