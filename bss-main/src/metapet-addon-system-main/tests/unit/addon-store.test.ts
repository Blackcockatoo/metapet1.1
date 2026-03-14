import type { Addon } from "@bluesnake-studios/addon-core";
import { createMemoryPersistence, initializeAddonStore, selectEquippedAddons } from "@bluesnake-studios/addon-store";

const sampleAddon: Addon = {
  id: "aura-001",
  templateId: "moss60-aura",
  category: "aura",
  rarity: "rare",
  edition: 1,
  ownerPublicKey: "owner-public-key",
  issuerId: "bluesnake-studios",
  metadata: {
    title: "Aura #1",
    description: "Stored in local inventory",
    traits: {
      colorway: "verdant",
      pulse: 10
    }
  },
  nonce: "store-nonce",
  issuedAt: "2026-03-10T00:00:00.000Z",
  editionLabel: "#1",
  proof: {
    algorithm: "ECDSA_P256_SHA256",
    issuerPublicKey: "issuer-public-key",
    signature: "signature",
    signedAt: "2026-03-10T00:00:00.000Z"
  },
  equipped: false
};

const replacementAura: Addon = {
  ...sampleAddon,
  id: "aura-002",
  edition: 2,
  editionLabel: "#2",
  metadata: {
    ...sampleAddon.metadata,
    title: "Aura #2"
  }
};

describe("addon-store", () => {
  it("ingests and equips an addon", async () => {
    const store = initializeAddonStore("owner-public-key", {
      verifier: async () => true,
      persistence: createMemoryPersistence()
    });

    await store.getState().addAddon(sampleAddon);
    await store.getState().equipAddon(sampleAddon.id);

    expect(selectEquippedAddons(store.getState())).toHaveLength(1);
  });

  it("unequips the previous addon in the same category", async () => {
    const store = initializeAddonStore("owner-public-key", {
      verifier: async () => true,
      persistence: createMemoryPersistence()
    });

    await store.getState().addAddon(sampleAddon);
    await store.getState().addAddon(replacementAura);
    await store.getState().equipAddon(sampleAddon.id);
    await store.getState().equipAddon(replacementAura.id);

    expect(store.getState().addons[sampleAddon.id]?.equipped).toBe(false);
    expect(store.getState().addons[replacementAura.id]?.equipped).toBe(true);
    expect(selectEquippedAddons(store.getState()).map((addon) => addon.id)).toEqual([replacementAura.id]);
  });
});
