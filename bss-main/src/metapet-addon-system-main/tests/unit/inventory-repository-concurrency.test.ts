import type { Addon, AddonCategory } from "@bluesnake-studios/addon-core";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  appendOwnedAddon,
  loadInventorySnapshot,
  saveInventorySnapshot,
  transferOwnedAddon
} from "@/lib/server/inventory-repository";
import { resetAppDatabaseAdapterForTests } from "@/lib/server/app-database-adapter";

const originalDatabasePath = process.env.APP_DATABASE_PATH;

function createAddon(id: string, ownerPublicKey: string, category: AddonCategory): Addon {
  return {
    id,
    templateId: `template-${category}`,
    category,
    rarity: "rare",
    edition: 1,
    ownerPublicKey,
    issuerId: "test-issuer",
    metadata: {
      title: `Addon ${id}`,
      description: "concurrency test addon",
      traits: {
        tier: "test"
      }
    },
    nonce: `nonce-${id}`,
    issuedAt: "2026-01-01T00:00:00.000Z",
    editionLabel: "#1",
    proof: {
      algorithm: "ECDSA_P256_SHA256",
      issuerPublicKey: "issuer-public-key",
      signature: `signature-${id}`,
      signedAt: "2026-01-01T00:00:00.000Z"
    },
    equipped: false,
    equippedAt: undefined
  };
}

describe.sequential("inventory repository concurrency", () => {
  let dataPath = "";

  beforeEach(async () => {
    dataPath = await mkdtemp(join(tmpdir(), "metapet-inventory-"));
    process.env.APP_DATABASE_PATH = dataPath;
    resetAppDatabaseAdapterForTests();
    await rm(join(dataPath, "app-db.json"), { force: true });
  });

  afterEach(() => {
    resetAppDatabaseAdapterForTests();

    if (originalDatabasePath === undefined) {
      delete process.env.APP_DATABASE_PATH;
      return;
    }

    process.env.APP_DATABASE_PATH = originalDatabasePath;
  });

  it("keeps all addons when appending in parallel for the same owner", async () => {
    const owner = "owner-parallel";
    const totalAddons = 40;

    await Promise.all(
      Array.from({ length: totalAddons }, (_, index) =>
        appendOwnedAddon(owner, createAddon(`addon-${index}`, owner, "aura"))
      )
    );

    const snapshot = await loadInventorySnapshot(owner);

    expect(snapshot).toBeDefined();
    expect(Object.keys(snapshot?.addons ?? {})).toHaveLength(totalAddons);
  }, 15_000);

  it("supports opposite-direction transfers without deadlocking and preserves ownership", async () => {
    const ownerA = "owner-a";
    const ownerB = "owner-b";

    const addonA = createAddon("addon-a", ownerA, "wings");
    const addonB = createAddon("addon-b", ownerB, "mask");

    await saveInventorySnapshot(ownerA, {
      ownerPublicKey: ownerA,
      addons: {
        [addonA.id]: {
          ...addonA,
          equipped: true,
          equippedAt: "2026-01-01T00:00:00.000Z"
        }
      },
      equippedByCategory: {
        wings: addonA.id
      }
    });

    await saveInventorySnapshot(ownerB, {
      ownerPublicKey: ownerB,
      addons: {
        [addonB.id]: addonB
      },
      equippedByCategory: {}
    });

    const [aToB, bToA] = await Promise.all([
      transferOwnedAddon(addonA.id, ownerA, ownerB),
      transferOwnedAddon(addonB.id, ownerB, ownerA)
    ]);

    expect(aToB).toBe(true);
    expect(bToA).toBe(true);

    const [snapshotA, snapshotB] = await Promise.all([loadInventorySnapshot(ownerA), loadInventorySnapshot(ownerB)]);

    expect(snapshotA?.addons[addonB.id]?.ownerPublicKey).toBe(ownerA);
    expect(snapshotB?.addons[addonA.id]?.ownerPublicKey).toBe(ownerB);
    expect(snapshotB?.addons[addonA.id]?.equipped).toBe(false);
    expect(snapshotB?.addons[addonA.id]?.equippedAt).toBeUndefined();
    expect(snapshotA?.equippedByCategory.wings).toBeUndefined();
  }, 15_000);
});
