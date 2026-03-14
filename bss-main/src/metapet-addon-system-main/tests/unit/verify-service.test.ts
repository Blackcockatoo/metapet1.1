import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyAddonFromRequest } from "@/lib/server/verify-service";

const { mockVerifySignedAddonPayload } = vi.hoisted(() => ({
  mockVerifySignedAddonPayload: vi.fn()
}));

const envKeys = ["ADDON_ISSUER_ID", "ADDON_ISSUER_PUBLIC_KEY", "ADDON_MANAGED_ISSUER_PUBLIC_KEY", "ADDON_MANAGED_SIGNER_KEY_ID", "ADDON_TRUSTED_ISSUER_KEYS_JSON"] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

vi.mock("@bluesnake-studios/addon-crypto", async () => {
  const actual = await vi.importActual("@bluesnake-studios/addon-crypto");

  return {
    ...actual,
    verifySignedAddonPayload: mockVerifySignedAddonPayload
  };
});

const validAddon = {
  id: "addon-fixed-01",
  templateId: "moss60-aura",
  category: "aura",
  rarity: "rare",
  edition: 1,
  ownerPublicKey: "owner-a",
  issuerId: "bluesnake-studios",
  metadata: {
    title: "Aura #1",
    description: "deterministic",
    traits: { tone: "azure" }
  },
  nonce: "nonce-fixed-0001",
  issuedAt: "2026-01-01T00:00:00.000Z",
  editionLabel: "#1",
  proof: {
    algorithm: "ECDSA_P256_SHA256",
    issuerPublicKey: "issuer-fixed",
    signature: "signature-fixed",
    signedAt: "2026-01-01T00:00:00.000Z"
  },
  equipped: false
} as const;

describe("verify-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADDON_ISSUER_ID = "bluesnake-studios";
    process.env.ADDON_ISSUER_PUBLIC_KEY = "issuer-fixed";
    delete process.env.ADDON_MANAGED_ISSUER_PUBLIC_KEY;
    delete process.env.ADDON_MANAGED_SIGNER_KEY_ID;
    delete process.env.ADDON_TRUSTED_ISSUER_KEYS_JSON;
  });

  it("returns 400 VERIFY_PAYLOAD_INVALID for malformed addon proof", async () => {
    const response = await verifyAddonFromRequest({
      ...validAddon,
      proof: {
        ...validAddon.proof,
        signedAt: "not-a-timestamp"
      }
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: "VERIFY_PAYLOAD_INVALID" });
  });

  it("rejects add-ons signed by untrusted issuers", async () => {
    delete process.env.ADDON_ISSUER_PUBLIC_KEY;

    const response = await verifyAddonFromRequest(validAddon);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "VERIFY_UNTRUSTED_ISSUER",
      verified: false
    });
    expect(mockVerifySignedAddonPayload).not.toHaveBeenCalled();
  });

  it("rejects revoked issuer keys before signature verification", async () => {
    delete process.env.ADDON_ISSUER_PUBLIC_KEY;
    process.env.ADDON_TRUSTED_ISSUER_KEYS_JSON = JSON.stringify([
      {
        issuerId: "bluesnake-studios",
        keyId: "issuer-key-v1",
        publicKey: "issuer-fixed",
        status: "revoked"
      }
    ]);

    const response = await verifyAddonFromRequest({
      ...validAddon,
      proof: {
        ...validAddon.proof,
        keyId: "issuer-key-v1"
      }
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      code: "VERIFY_REVOKED_ISSUER_KEY",
      verified: false
    });
    expect(mockVerifySignedAddonPayload).not.toHaveBeenCalled();
  });

  it("returns 401 VERIFY_INVALID_SIGNATURE when signature verification fails", async () => {
    mockVerifySignedAddonPayload.mockResolvedValue(false);

    const response = await verifyAddonFromRequest(validAddon);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "VERIFY_INVALID_SIGNATURE",
      message: "Addon signature verification failed.",
      verified: false
    });
    expect(mockVerifySignedAddonPayload).toHaveBeenCalledWith(expect.any(Object), "signature-fixed", "issuer-fixed");
  });

  it("verifies against the trusted managed signer key instead of the embedded proof key", async () => {
    mockVerifySignedAddonPayload.mockResolvedValue(true);
    delete process.env.ADDON_ISSUER_PUBLIC_KEY;
    process.env.ADDON_MANAGED_SIGNER_KEY_ID = "issuer-key-v2";
    process.env.ADDON_MANAGED_ISSUER_PUBLIC_KEY = "issuer-managed";

    const response = await verifyAddonFromRequest({
      ...validAddon,
      proof: {
        ...validAddon.proof,
        issuerPublicKey: "embedded-proof-key",
        keyId: "issuer-key-v2"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      verified: true,
      issuerId: "bluesnake-studios",
      signerKeyId: "issuer-key-v2"
    });
    expect(mockVerifySignedAddonPayload).toHaveBeenCalledWith(expect.any(Object), "signature-fixed", "issuer-managed");
  });

  afterAll(() => {
    for (const key of envKeys) {
      const original = originalEnv[key];

      if (original === undefined) {
        delete process.env[key];
        continue;
      }

      process.env[key] = original;
    }
  });
});
