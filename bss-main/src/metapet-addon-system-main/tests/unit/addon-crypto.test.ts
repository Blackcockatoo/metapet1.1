import { canonicalSerialize, generateAddonKeypair, signCanonicalPayload, verifyCanonicalPayload } from "@bluesnake-studios/addon-crypto";

describe("addon-crypto", () => {
  it("serializes keys in stable order", () => {
    expect(canonicalSerialize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("signs and verifies canonical payloads", async () => {
    const keypair = await generateAddonKeypair();
    const payload = { addonId: "demo-addon", issuedAt: "2026-03-10T00:00:00.000Z" };
    const signature = await signCanonicalPayload(payload, keypair.privateKey);

    await expect(verifyCanonicalPayload(payload, signature, keypair.publicKey)).resolves.toBe(true);
  });
});
