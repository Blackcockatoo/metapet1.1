import type { Addon } from "@bluesnake-studios/addon-core";
import { createMoss60VerifiablePayload, decodeMoss60Payload, encodeMoss60Payload } from "@bluesnake-studios/moss60";

const sampleAddon: Addon = {
  id: "wings-001",
  templateId: "moss60-sovereign-wings",
  category: "wings",
  rarity: "legendary",
  edition: 1,
  ownerPublicKey: "owner-public-key",
  issuerId: "bluesnake-studios",
  metadata: {
    title: "Wings #1",
    description: "Share payload example",
    traits: {
      plumage: "sun-gold",
      span: 88
    }
  },
  nonce: "share-nonce",
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

describe("moss60", () => {
  it("encodes and decodes a verifiable payload", async () => {
    const payload = await createMoss60VerifiablePayload(sampleAddon);
    const encoded = encodeMoss60Payload(payload);
    const decoded = decodeMoss60Payload(encoded);

    expect(decoded.addon.id).toBe(sampleAddon.id);
    expect(decoded.addonDigest).toBe(payload.addonDigest);
  });
});
