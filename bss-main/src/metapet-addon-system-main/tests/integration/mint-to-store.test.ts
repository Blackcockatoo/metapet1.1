import { toSignedAddonPayload, moss60SovereignWingsTemplate } from "@bluesnake-studios/addon-core";
import { exportPublicKey, generateAddonKeypair, signCanonicalPayload, verifySignedAddonPayload } from "@bluesnake-studios/addon-crypto";
import { mintAddon } from "@bluesnake-studios/addon-minting";
import { createMemoryPersistence, initializeAddonStore, selectAddons } from "@bluesnake-studios/addon-store";

import { POST as mintRoutePost } from "@/app/api/mint/route";
import { POST as transferRoutePost } from "@/app/api/transfer/route";
import { POST as verifyRoutePost } from "@/app/api/verify/route";

describe("mint to store integration", () => {
  it("mints, verifies, and stores an addon", async () => {
    const keypair = await generateAddonKeypair();
    const issuerPublicKey = await exportPublicKey(keypair.publicKey);

    const minted = await mintAddon({
      addonId: "wings-099",
      template: moss60SovereignWingsTemplate,
      edition: 9,
      ownerPublicKey: "receiver-public-key",
      issuerId: "bluesnake-studios",
      issuerPublicKey,
      metadata: {
        title: "Sovereign Wings #9",
        description: "Integration test asset",
        traits: {
          plumage: "moon-silver",
          span: 72
        }
      },
      nonce: "integration-nonce",
      sign: (payload) => signCanonicalPayload(payload, keypair.privateKey)
    });

    const store = initializeAddonStore("receiver-public-key", {
      verifier: (addon) => verifySignedAddonPayload(toSignedAddonPayload(addon), addon.proof.signature, addon.proof.issuerPublicKey),
      persistence: createMemoryPersistence()
    });

    await store.getState().addAddon(minted.addon);

    expect(selectAddons(store.getState())).toHaveLength(1);
  });

  it("returns signer and auth error codes from HTTP handlers", async () => {
    process.env.ADMIN_API_TOKEN = "admin-fixed-token";
    delete process.env.ADDON_ISSUER_PRIVATE_KEY;
    delete process.env.ADDON_ISSUER_PUBLIC_KEY;

    const mintResponse = await mintRoutePost(
      new Request("http://localhost/api/mint", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": "admin-fixed-token"
        },
        body: JSON.stringify({
          templateId: "moss60-aura",
          addonId: "mint-401",
          edition: 1,
          ownerPublicKey: "owner-a",
          metadata: { title: "Aura #1", description: "x", traits: {} }
        })
      })
    );

    expect(mintResponse.status).toBe(501);
    await expect(mintResponse.json()).resolves.toMatchObject({ code: "SIGNER_MISCONFIGURED_KEY" });

    const unauthorizedTransferResponse = await transferRoutePost(
      new Request("http://localhost/api/transfer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": "wrong-token"
        },
        body: JSON.stringify({ addonId: "a", fromOwnerPublicKey: "owner-a", toOwnerPublicKey: "owner-b" })
      })
    );

    expect(unauthorizedTransferResponse.status).toBe(401);
    await expect(unauthorizedTransferResponse.json()).resolves.toMatchObject({ code: "ADMIN_UNAUTHORIZED" });
  });

  it("returns verify schema error code for malformed addon proof", async () => {
    const verifyResponse = await verifyRoutePost(
      new Request("http://localhost/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "addon-fixed-01",
          templateId: "moss60-aura",
          category: "aura",
          rarity: "rare",
          edition: 1,
          ownerPublicKey: "owner-a",
          issuerId: "bluesnake-studios",
          metadata: { title: "Aura #1", description: "deterministic", traits: {} },
          nonce: "nonce-fixed-0001",
          issuedAt: "2026-01-01T00:00:00.000Z",
          editionLabel: "#1",
          proof: {
            algorithm: "ECDSA_P256_SHA256",
            issuerPublicKey: "issuer-fixed",
            signature: "signature-fixed",
            signedAt: "not-a-timestamp"
          },
          equipped: false
        })
      })
    );

    expect(verifyResponse.status).toBe(400);
    await expect(verifyResponse.json()).resolves.toMatchObject({ code: "VERIFY_PAYLOAD_INVALID" });
  });
});
