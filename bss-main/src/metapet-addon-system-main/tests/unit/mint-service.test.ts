import { beforeEach, describe, expect, it, vi } from "vitest";

import { mintAddonFromRequest } from "@/lib/server/mint-service";

const {
  mockResolveIssuerSigner,
  mockAppendOwnedAddon,
  mockGetAddonTemplate,
  mockMintTimeLimitedAddon,
  MockManagedSignerRuntimeError
} = vi.hoisted(() => {
  class MockManagedSignerRuntimeError extends Error {
    readonly code: string;
    readonly status?: number;

    constructor(code: string, message: string, options?: { status?: number }) {
      super(message);
      this.code = code;
      this.status = options?.status;
    }
  }

  return {
    mockResolveIssuerSigner: vi.fn(),
    mockAppendOwnedAddon: vi.fn(),
    mockGetAddonTemplate: vi.fn(),
    mockMintTimeLimitedAddon: vi.fn(),
    MockManagedSignerRuntimeError
  };
});

vi.mock("@/lib/server/custody-signer", () => ({
  resolveIssuerSigner: mockResolveIssuerSigner,
  isManagedSignerRuntimeError: (error: unknown) => error instanceof MockManagedSignerRuntimeError,
  ManagedSignerRuntimeError: MockManagedSignerRuntimeError
}));

vi.mock("@/lib/server/inventory-repository", () => ({
  appendOwnedAddon: mockAppendOwnedAddon
}));

vi.mock("@bluesnake-studios/addon-core", async () => {
  const actual = await vi.importActual("@bluesnake-studios/addon-core");

  return {
    ...actual,
    getAddonTemplate: mockGetAddonTemplate
  };
});

vi.mock("@bluesnake-studios/addon-minting", async () => {
  const actual = await vi.importActual("@bluesnake-studios/addon-minting");

  return {
    ...actual,
    mintTimeLimitedAddon: mockMintTimeLimitedAddon
  };
});

describe("mint-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 501 SIGNER_UNAVAILABLE when signer is missing", async () => {
    mockResolveIssuerSigner.mockResolvedValue(undefined);

    const response = await mintAddonFromRequest({
      templateId: "moss60-aura",
      addonId: "addon-001",
      edition: 1,
      ownerPublicKey: "owner-a",
      metadata: {
        title: "Aura #1",
        description: "fixture",
        traits: { tone: "azure" }
      }
    });

    expect(response.status).toBe(501);
    expect(response.body).toMatchObject({ code: "SIGNER_UNAVAILABLE" });
  });

  it("returns 400 MINT_PAYLOAD_INVALID for malformed metadata schema", async () => {
    const response = await mintAddonFromRequest({
      templateId: "moss60-aura",
      addonId: "addon-002",
      edition: 1,
      ownerPublicKey: "owner-a",
      metadata: {
        title: "",
        description: "fixture",
        traits: { tone: "azure" }
      }
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: "MINT_PAYLOAD_INVALID" });
  });

  it("returns deterministic success payload and persists minted addon", async () => {
    mockResolveIssuerSigner.mockResolvedValue({
      ok: true,
      signer: {
        issuerPublicKey: "issuer-fixed",
        keyId: "issuer-key-v2",
        custodyMode: "local-dev",
        sign: vi.fn().mockResolvedValue("signed")
      }
    });
    mockGetAddonTemplate.mockReturnValue({
      id: "moss60-aura",
      collection: "moss60",
      name: "Aura",
      slug: "aura",
      category: "aura",
      rarity: "rare",
      editionLimit: { policy: "open" },
      metadataModel: { tags: [], fields: [] },
      previewText: "Aura"
    });
    mockMintTimeLimitedAddon.mockResolvedValue({
      addon: {
        id: "addon-003",
        templateId: "moss60-aura",
        category: "aura",
        rarity: "rare",
        edition: 3,
        ownerPublicKey: "owner-a",
        issuerId: "bluesnake-studios",
        metadata: { title: "Aura #3", description: "fixed", traits: {} },
        nonce: "nonce-fixed-0001",
        issuedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T01:00:00.000Z",
        editionLabel: "#3",
        proof: {
          algorithm: "ECDSA_P256_SHA256",
          issuerPublicKey: "issuer-fixed",
          signature: "sig-fixed",
          signedAt: "2026-01-01T00:00:00.000Z",
          keyId: "issuer-key-v1"
        },
        equipped: false
      }
    });

    const response = await mintAddonFromRequest({
      templateId: "moss60-aura",
      addonId: "addon-003",
      edition: 3,
      ownerPublicKey: "owner-a",
      metadata: {
        title: "Aura #3",
        description: "fixed",
        traits: {}
      }
    });

    expect(response.status).toBe(200);
    expect(mockAppendOwnedAddon).toHaveBeenCalledWith("owner-a", expect.objectContaining({ nonce: "nonce-fixed-0001" }));
    expect(mockMintTimeLimitedAddon).toHaveBeenCalledWith(expect.objectContaining({ keyId: "issuer-key-v2" }));
  });

  it("returns 502 when managed signer calls fail after initialization", async () => {
    mockResolveIssuerSigner.mockResolvedValue({
      ok: true,
      signer: {
        issuerPublicKey: "issuer-managed",
        keyId: "issuer-key-v3",
        custodyMode: "managed",
        sign: vi.fn()
      }
    });
    mockGetAddonTemplate.mockReturnValue({
      id: "moss60-aura",
      collection: "moss60",
      name: "Aura",
      slug: "aura",
      category: "aura",
      rarity: "rare",
      editionLimit: { policy: "open" },
      metadataModel: { tags: [], fields: [] },
      previewText: "Aura"
    });

    mockMintTimeLimitedAddon.mockRejectedValue(
      Object.assign(new Error("Managed signer request failed with status 503."), {
        code: "SIGNER_REQUEST_FAILED",
        custodyMode: "managed" as const
      })
    );

    const response = await mintAddonFromRequest({
      templateId: "moss60-aura",
      addonId: "addon-004",
      edition: 4,
      ownerPublicKey: "owner-b",
      metadata: {
        title: "Aura #4",
        description: "managed",
        traits: {}
      }
    });

    expect(response).toEqual({
      status: 502,
      body: {
        error: "Managed signer request failed with status 503.",
        code: "SIGNER_REQUEST_FAILED",
        custodyMode: "managed"
      }
    });
  });

  it("maps managed signer timeout failures to 504", async () => {
    mockResolveIssuerSigner.mockResolvedValue({
      ok: true,
      signer: {
        issuerPublicKey: "issuer-fixed",
        custodyMode: "managed",
        keyId: "issuer-key-v1",
        sign: vi.fn()
      }
    });
    mockGetAddonTemplate.mockReturnValue({
      id: "moss60-aura",
      collection: "moss60",
      name: "Aura",
      slug: "aura",
      category: "aura",
      rarity: "rare",
      editionLimit: { policy: "open" },
      metadataModel: { tags: [], fields: [] },
      previewText: "Aura"
    });
    mockMintTimeLimitedAddon.mockRejectedValue(
      new MockManagedSignerRuntimeError("MANAGED_SIGNER_TIMEOUT", "Managed signer timed out after 3000ms.")
    );

    const response = await mintAddonFromRequest({
      templateId: "moss60-aura",
      addonId: "addon-004",
      edition: 1,
      ownerPublicKey: "owner-a",
      metadata: { title: "Aura #4", description: "fixture", traits: {} }
    });

    expect(response.status).toBe(504);
    expect(response.body).toMatchObject({ code: "MANAGED_SIGNER_TIMEOUT" });
  });

  it("maps managed signer http failures to 502", async () => {
    mockResolveIssuerSigner.mockResolvedValue({
      ok: true,
      signer: {
        issuerPublicKey: "issuer-fixed",
        custodyMode: "managed",
        keyId: "issuer-key-v1",
        sign: vi.fn()
      }
    });
    mockGetAddonTemplate.mockReturnValue({
      id: "moss60-aura",
      collection: "moss60",
      name: "Aura",
      slug: "aura",
      category: "aura",
      rarity: "rare",
      editionLimit: { policy: "open" },
      metadataModel: { tags: [], fields: [] },
      previewText: "Aura"
    });
    mockMintTimeLimitedAddon.mockRejectedValue(
      new MockManagedSignerRuntimeError("MANAGED_SIGNER_HTTP_ERROR", "Managed signer request failed with status 500.", { status: 500 })
    );

    const response = await mintAddonFromRequest({
      templateId: "moss60-aura",
      addonId: "addon-005",
      edition: 1,
      ownerPublicKey: "owner-a",
      metadata: { title: "Aura #5", description: "fixture", traits: {} }
    });

    expect(response.status).toBe(502);
    expect(response.body).toMatchObject({ code: "MANAGED_SIGNER_HTTP_ERROR" });
  });
});
