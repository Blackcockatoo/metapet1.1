import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveIssuerSignerMock } = vi.hoisted(() => ({
  resolveIssuerSignerMock: vi.fn()
}));

vi.mock("@/lib/server/custody-signer", () => ({
  resolveIssuerSigner: resolveIssuerSignerMock
}));

import { issueMintedAddon } from "@/lib/server/mint-service";

const payload = {
  templateId: "moss60-mask",
  addonId: "mask-typed-error-test",
  edition: 1,
  ownerPublicKey: "owner-public-key",
  metadata: {
    title: "Mask",
    description: "Test addon",
    traits: {
      finish: "carbon",
      crest: "north"
    }
  }
};

describe("issueMintedAddon signer failures", () => {
  beforeEach(() => {
    resolveIssuerSignerMock.mockReset();
  });

  it("returns 501 with typed misconfigured-key error", async () => {
    resolveIssuerSignerMock.mockResolvedValue({
      ok: false,
      error: {
        code: "SIGNER_MISCONFIGURED_KEY",
        message: "Signer initialization failed for local-dev: issuer public/private key env vars are required.",
        custodyMode: "local-dev"
      }
    });

    const result = await issueMintedAddon(payload);

    expect(result).toEqual({
      status: 501,
      body: {
        error: "Signer initialization failed for local-dev: issuer public/private key env vars are required.",
        code: "SIGNER_MISCONFIGURED_KEY",
        custodyMode: "local-dev"
      }
    });
  });

  it("returns 501 with typed unavailable-backend error", async () => {
    resolveIssuerSignerMock.mockResolvedValue({
      ok: false,
      error: {
        code: "SIGNER_BACKEND_UNAVAILABLE",
        message: "Signer initialization failed for managed custody: backend \"vault\" is unavailable.",
        custodyMode: "managed"
      }
    });

    const result = await issueMintedAddon(payload);

    expect(result).toEqual({
      status: 501,
      body: {
        error: "Signer initialization failed for managed custody: backend \"vault\" is unavailable.",
        code: "SIGNER_BACKEND_UNAVAILABLE",
        custodyMode: "managed"
      }
    });
  });
});
