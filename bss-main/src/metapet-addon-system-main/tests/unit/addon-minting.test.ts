import { moss60MaskTemplate } from "@bluesnake-studios/addon-core";
import { exportPublicKey, generateAddonKeypair, signCanonicalPayload, verifySignedAddonPayload } from "@bluesnake-studios/addon-crypto";
import { createInMemoryReplayGuard, createTransferDraft, mintAddon } from "@bluesnake-studios/addon-minting";

describe("addon-minting", () => {
  it("mints a signed addon artifact", async () => {
    const keypair = await generateAddonKeypair();
    const issuerPublicKey = await exportPublicKey(keypair.publicKey);

    const minted = await mintAddon({
      addonId: "mask-001",
      template: moss60MaskTemplate,
      edition: 1,
      ownerPublicKey: "owner-public-key",
      issuerId: "bluesnake-studios",
      issuerPublicKey,
      metadata: {
        title: "Mask #1",
        description: "Starter minted add-on",
        traits: {
          finish: "carbon",
          crest: "north"
        }
      },
      nonce: "nonce-1",
      sign: (payload) => signCanonicalPayload(payload, keypair.privateKey)
    });

    await expect(
      verifySignedAddonPayload(minted.signedPayload, minted.addon.proof.signature, minted.addon.proof.issuerPublicKey)
    ).resolves.toBe(true);
  });

  it("rejects replayed nonces when a replay guard is provided", async () => {
    const keypair = await generateAddonKeypair();
    const issuerPublicKey = await exportPublicKey(keypair.publicKey);
    const replayGuard = createInMemoryReplayGuard();

    const input = {
      addonId: "mask-002",
      template: moss60MaskTemplate,
      edition: 2,
      ownerPublicKey: "owner-public-key",
      issuerId: "bluesnake-studios",
      issuerPublicKey,
      metadata: {
        title: "Mask #2",
        description: "Replay guard sample",
        traits: {
          finish: "glass",
          crest: "south"
        }
      },
      nonce: "nonce-replay",
      replayGuard,
      sign: (payload: Parameters<typeof signCanonicalPayload>[0]) => signCanonicalPayload(payload, keypair.privateKey)
    };

    await mintAddon(input);

    await expect(mintAddon(input)).rejects.toThrow(/Replay detected/);
  });

  it("can require receiver consent on transfer drafts", () => {
    expect(() =>
      createTransferDraft(
        {
          addonId: "mask-transfer-001",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b",
          nonce: "transfer-nonce-1",
          issuedAt: new Date().toISOString()
        },
        { requireReceiverConsent: true }
      )
    ).toThrow(/Receiver consent is required/);
  });

  it("rejects receiver consent that targets a different destination owner", () => {
    expect(() =>
      createTransferDraft(
        {
          addonId: "mask-transfer-002",
          fromOwnerPublicKey: "owner-a",
          toOwnerPublicKey: "owner-b",
          nonce: "transfer-nonce-2",
          issuedAt: new Date().toISOString(),
          receiverConsent: {
            requestId: "transfer-request-1",
            addonId: "mask-transfer-002",
            fromOwnerPublicKey: "owner-a",
            toOwnerPublicKey: "owner-b",
            receiverPublicKey: "owner-c",
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            acceptedAt: new Date().toISOString(),
            signature: "sig"
          }
        },
        { requireReceiverConsent: true }
      )
    ).toThrow(/destination owner public key/);
  });
});
