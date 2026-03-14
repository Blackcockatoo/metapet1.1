import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAddonTemplateMock,
  getStorefrontListingMock,
  issueMintedAddonMock,
  runAppDatabaseTransactionMock,
  transactionGetStorefrontListingMock,
  transactionInsertStorefrontOrderMock,
  transactionUpsertStorefrontListingMock
} = vi.hoisted(() => ({
  getAddonTemplateMock: vi.fn(),
  getStorefrontListingMock: vi.fn(),
  issueMintedAddonMock: vi.fn(),
  runAppDatabaseTransactionMock: vi.fn(),
  transactionGetStorefrontListingMock: vi.fn(),
  transactionInsertStorefrontOrderMock: vi.fn(),
  transactionUpsertStorefrontListingMock: vi.fn()
}));

vi.mock("@bluesnake-studios/addon-core", async () => {
  const actual = await vi.importActual("@bluesnake-studios/addon-core");

  return {
    ...actual,
    getAddonTemplate: getAddonTemplateMock
  };
});

vi.mock("@/lib/server/app-database-adapter", () => ({
  runAppDatabaseTransaction: runAppDatabaseTransactionMock
}));

vi.mock("@/lib/server/listings-repository", () => ({
  getStorefrontListing: getStorefrontListingMock
}));

vi.mock("@/lib/server/inventory-repository", () => ({
  appendOwnedAddon: vi.fn(async () => undefined)
}));

vi.mock("@/lib/server/mint-service", () => ({
  issueMintedAddon: issueMintedAddonMock
}));

import { purchaseListingFromRequest } from "@/lib/server/purchase-service";

describe("purchase-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    getStorefrontListingMock.mockResolvedValue({
      id: "moss60-aura",
      templateId: "moss60-aura",
      slug: "aura",
      name: "Aura",
      category: "aura",
      rarity: "rare",
      previewText: "Aura",
      editionText: "Open edition",
      fieldSummary: "rarity",
      priceCents: 2200,
      currency: "USD",
      status: "active",
      visibility: "public",
      badge: "rare",
      soldCount: 0,
      defaultMetadata: {
        title: "Aura",
        description: "fixture",
        traits: {}
      }
    });
    transactionGetStorefrontListingMock.mockImplementation(async () => getStorefrontListingMock());
    transactionInsertStorefrontOrderMock.mockResolvedValue(undefined);
    transactionUpsertStorefrontListingMock.mockResolvedValue(undefined);
    runAppDatabaseTransactionMock.mockImplementation(async (work: (transaction: unknown) => Promise<unknown>) =>
      work({
        loadInventorySnapshot: vi.fn(async () => undefined),
        saveInventorySnapshot: vi.fn(async () => undefined),
        clearInventorySnapshot: vi.fn(async () => undefined),
        getStorefrontListing: transactionGetStorefrontListingMock,
        upsertStorefrontListing: transactionUpsertStorefrontListingMock,
        insertStorefrontOrder: transactionInsertStorefrontOrderMock,
        upsertReplayNonce: vi.fn(async () => "accepted")
      })
    );
    getAddonTemplateMock.mockReturnValue({ id: "moss60-aura" });
  });

  it("persists the signer key ID on storefront orders", async () => {
    issueMintedAddonMock.mockResolvedValue({
      status: 200,
      body: {
        custodyMode: "managed",
        addon: {
          id: "addon-1",
          proof: {
            keyId: "issuer-key-v3"
          }
        }
      }
    });

    const result = await purchaseListingFromRequest({
      listingId: "moss60-aura",
      ownerPublicKey: "owner-a"
    });

    expect(result.status).toBe(200);
    expect(transactionInsertStorefrontOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signerKeyId: "issuer-key-v3",
        custodyMode: "managed"
      })
    );
  });
});
