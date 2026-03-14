export const APP_NAME = "BlueSnake Studios Meta-Pet Add-on System";

export const ROUTE_PATHS = {
  home: "/",
  shop: "/shop",
  inventory: "/inventory",
  admin: "/admin",
  adminAddons: "/admin/addons",
  adminMint: "/admin/mint"
} as const;

export const STORAGE_KEYS = {
  addonStore: "bluesnake.metapet.addon-store.v1"
} as const;

export const CRYPTO_CONSTANTS = {
  algorithm: "ECDSA",
  namedCurve: "P-256",
  hash: "SHA-256",
  signatureLabel: "ECDSA_P256_SHA256"
} as const;

export const MINTING_CONSTANTS = {
  defaultMintTtlMs: 5 * 60 * 1000,
  defaultShareTtlMs: 30 * 60 * 1000,
  maxBatchMintSize: 100
} as const;

export const TODO_NOTES = {
  issuerCustody: "TODO: move issuer key custody into a managed signing service or HSM-backed workflow.",
  productionDatabase: "TODO: replace local-first persistence with a production database adapter and audit trail.",
  serverSideSigning: "TODO: wire server-side signing through an authenticated admin boundary instead of local placeholders."
} as const;
