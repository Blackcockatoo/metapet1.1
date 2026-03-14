import type { AddonStoreSnapshot } from "@bluesnake-studios/addon-store";
import { createFutureDatabaseAdapter, createInMemoryDatabaseDriver } from "@bluesnake-studios/addon-store";

describe("addon-store database adapter", () => {
  it("persists and clears snapshots via the database driver", async () => {
    const seed: AddonStoreSnapshot = {
      ownerPublicKey: "owner-a",
      addons: {},
      equippedByCategory: {}
    };

    const adapter = createFutureDatabaseAdapter(createInMemoryDatabaseDriver([seed]));
    expect(await adapter.load("owner-a")).toEqual(seed);

    const replacement: AddonStoreSnapshot = {
      ownerPublicKey: "owner-a",
      addons: {
        "addon-1": {
          id: "addon-1",
          templateId: "moss60-aura",
          category: "aura",
          rarity: "rare",
          edition: 1,
          ownerPublicKey: "owner-a",
          issuerId: "bluesnake-studios",
          metadata: {
            title: "Aura",
            description: "db adapter",
            traits: {}
          },
          nonce: "nonce-1",
          issuedAt: "2026-01-01T00:00:00.000Z",
          editionLabel: "#1",
          proof: {
            algorithm: "ECDSA_P256_SHA256",
            issuerPublicKey: "issuer",
            signature: "sig",
            signedAt: "2026-01-01T00:00:00.000Z"
          },
          equipped: false
        }
      },
      equippedByCategory: {}
    };

    await adapter.save("owner-a", replacement);
    expect(await adapter.load("owner-a")).toEqual(replacement);

    await adapter.clear("owner-a");
    expect(await adapter.load("owner-a")).toBeUndefined();
  });

  it("isolates deterministic snapshots per owner", async () => {
    const adapter = createFutureDatabaseAdapter(createInMemoryDatabaseDriver());

    const ownerA: AddonStoreSnapshot = {
      ownerPublicKey: "owner-a",
      addons: {},
      equippedByCategory: {}
    };

    const ownerB: AddonStoreSnapshot = {
      ownerPublicKey: "owner-b",
      addons: {},
      equippedByCategory: {}
    };

    await adapter.save("owner-a", ownerA);
    await adapter.save("owner-b", ownerB);

    expect(await adapter.load("owner-a")).toEqual(ownerA);
    expect(await adapter.load("owner-b")).toEqual(ownerB);
  });

});
