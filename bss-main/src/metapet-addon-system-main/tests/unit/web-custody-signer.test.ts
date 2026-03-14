import { exportPrivateKey, exportPublicKey, generateAddonKeypair, signCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SignedAddonPayload } from "@bluesnake-studios/addon-core";

import { resolveIssuerSigner } from "@/lib/server/custody-signer";

const envKeys = [
  "ADDON_CUSTODY_PROVIDER",
  "ADDON_ISSUER_PUBLIC_KEY",
  "ADDON_ISSUER_PRIVATE_KEY",
  "ADDON_MANAGED_ISSUER_PUBLIC_KEY",
  "ADDON_MANAGED_ISSUER_PRIVATE_KEY",
  "ADDON_MANAGED_SIGNER_BACKEND",
  "ADDON_MANAGED_SIGNER_ENDPOINT",
  "ADDON_MANAGED_SIGNER_KEY_ID",
  "ADDON_MANAGED_SIGNER_AUTH_MECHANISM",
  "ADDON_MANAGED_SIGNER_AUTH_TOKEN"
] as const;

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();

  for (const key of envKeys) {
    const original = originalEnv[key];

    if (original === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = original;
  }
});

describe("resolveIssuerSigner", () => {
  it("resolves local-dev signer when env keys are set", async () => {
    const keypair = await generateAddonKeypair();
    process.env.ADDON_CUSTODY_PROVIDER = "local-dev";
    process.env.ADDON_ISSUER_PUBLIC_KEY = await exportPublicKey(keypair.publicKey);
    process.env.ADDON_ISSUER_PRIVATE_KEY = await exportPrivateKey(keypair.privateKey);

    const result = await resolveIssuerSigner();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.signer.custodyMode).toBe("local-dev");
    expect(typeof result.signer.sign).toBe("function");
  });

  it("rejects local-dev custody in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.ADDON_CUSTODY_PROVIDER = "local-dev";

    const result = await resolveIssuerSigner();

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SIGNER_POLICY_VIOLATION",
        custodyMode: "local-dev",
        message: expect.stringContaining("production requires ADDON_CUSTODY_PROVIDER=managed")
      }
    });
  });

  it("returns misconfigured-key error when local-dev keys are missing", async () => {
    process.env.ADDON_CUSTODY_PROVIDER = "local-dev";
    delete process.env.ADDON_ISSUER_PUBLIC_KEY;
    delete process.env.ADDON_ISSUER_PRIVATE_KEY;

    const result = await resolveIssuerSigner();

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SIGNER_MISCONFIGURED_KEY",
        custodyMode: "local-dev",
        message: expect.stringContaining("issuer public/private key env vars are required")
      }
    });
  });

  it("returns malformed-key error when configured private key cannot be imported", async () => {
    process.env.ADDON_CUSTODY_PROVIDER = "local-dev";
    process.env.ADDON_ISSUER_PUBLIC_KEY = "demo-public-key";
    process.env.ADDON_ISSUER_PRIVATE_KEY = "not-a-valid-private-key";

    const result = await resolveIssuerSigner();

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SIGNER_MALFORMED_KEY",
        custodyMode: "local-dev",
        message: expect.stringContaining("could not be parsed")
      }
    });
  });

  it("returns unavailable-backend error when managed backend is unknown", async () => {
    process.env.ADDON_CUSTODY_PROVIDER = "managed";
    process.env.ADDON_MANAGED_SIGNER_BACKEND = "external-hsm";

    const result = await resolveIssuerSigner();

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SIGNER_BACKEND_UNAVAILABLE",
        custodyMode: "managed",
        message: expect.stringContaining("external-hsm")
      }
    });
  });

  it("returns misconfigured-key error when managed signer settings are incomplete", async () => {
    process.env.ADDON_CUSTODY_PROVIDER = "managed";
    process.env.ADDON_MANAGED_SIGNER_BACKEND = "http";
    delete process.env.ADDON_MANAGED_SIGNER_ENDPOINT;
    delete process.env.ADDON_MANAGED_SIGNER_KEY_ID;

    const result = await resolveIssuerSigner();

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SIGNER_MISCONFIGURED_KEY",
        custodyMode: "managed",
        message: expect.stringContaining("ADDON_MANAGED_SIGNER_ENDPOINT")
      }
    });
  });

  it("uses managed http signer provider to sign payloads", async () => {
    const keypair = await generateAddonKeypair();
    const issuerPublicKey = await exportPublicKey(keypair.publicKey);

    process.env.ADDON_CUSTODY_PROVIDER = "managed";
    process.env.ADDON_MANAGED_SIGNER_BACKEND = "http";
    process.env.ADDON_MANAGED_SIGNER_ENDPOINT = "https://signer.example.test/sign";
    process.env.ADDON_MANAGED_SIGNER_KEY_ID = "issuer-key-v1";
    process.env.ADDON_MANAGED_ISSUER_PUBLIC_KEY = issuerPublicKey;
    process.env.ADDON_MANAGED_SIGNER_AUTH_MECHANISM = "bearer-token";
    process.env.ADDON_MANAGED_SIGNER_AUTH_TOKEN = "managed-token";

    const expectedPayload: SignedAddonPayload = {
      id: "addon-001",
      templateId: "moss60-aura",
      category: "aura",
      rarity: "rare",
      edition: 1,
      ownerPublicKey: "owner-a",
      issuerId: "bluesnake-studios",
      metadata: {
        title: "Aura #1",
        description: "fixture",
        traits: {}
      },
      nonce: "nonce-001",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T01:00:00.000Z"
    };

    const expectedSignature = await signCanonicalPayload(expectedPayload, keypair.privateKey);

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ signature: expectedSignature, keyId: "issuer-key-v1", publicKey: issuerPublicKey }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveIssuerSigner();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.signer.custodyMode).toBe("managed");
    expect(result.signer.keyId).toBe("issuer-key-v1");

    const signature = await result.signer.sign(expectedPayload);
    expect(signature).toBe(expectedSignature);

    expect(fetchMock).toHaveBeenCalledWith("https://signer.example.test/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer managed-token"
      },
      body: JSON.stringify({
        keyId: "issuer-key-v1",
        payload: expectedPayload
        })
    });
  });

  it("rejects mismatched key metadata from the managed signer response", async () => {
    const keypair = await generateAddonKeypair();
    const issuerPublicKey = await exportPublicKey(keypair.publicKey);

    process.env.ADDON_CUSTODY_PROVIDER = "managed";
    process.env.ADDON_MANAGED_SIGNER_BACKEND = "http";
    process.env.ADDON_MANAGED_SIGNER_ENDPOINT = "https://signer.example.test/sign";
    process.env.ADDON_MANAGED_SIGNER_KEY_ID = "issuer-key-v1";
    process.env.ADDON_MANAGED_ISSUER_PUBLIC_KEY = issuerPublicKey;
    process.env.ADDON_MANAGED_SIGNER_AUTH_MECHANISM = "none";

    const payload: SignedAddonPayload = {
      id: "addon-002",
      templateId: "moss60-aura",
      category: "aura",
      rarity: "rare",
      edition: 2,
      ownerPublicKey: "owner-b",
      issuerId: "bluesnake-studios",
      metadata: {
        title: "Aura #2",
        description: "fixture",
        traits: {}
      },
      nonce: "nonce-002",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T01:00:00.000Z"
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ signature: "sig-2", keyId: "issuer-key-v2", publicKey: issuerPublicKey }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    const result = await resolveIssuerSigner();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    await expect(result.signer.sign(payload)).rejects.toMatchObject({
      name: "SignerRuntimeError",
      code: "SIGNER_BAD_RESPONSE",
      custodyMode: "managed",
      message: expect.stringContaining("keyId")
    });
  });
});
