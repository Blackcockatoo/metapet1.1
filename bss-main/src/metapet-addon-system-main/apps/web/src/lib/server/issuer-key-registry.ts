import type { Addon } from "@bluesnake-studios/addon-core";
import { parseServerEnv } from "@bluesnake-studios/config";
import { z } from "zod";

export interface TrustedIssuerKey {
  issuerId: string;
  keyId?: string;
  publicKey: string;
  status: "active" | "revoked";
  source: "local-dev" | "managed" | "registry";
}

export type ResolveTrustedIssuerKeyResult =
  | {
      ok: true;
      key: TrustedIssuerKey;
    }
  | {
      ok: false;
      code: "VERIFY_UNTRUSTED_ISSUER" | "VERIFY_REVOKED_ISSUER_KEY";
      message: string;
    };

const trustedIssuerKeySchema = z.object({
  issuerId: z.string().trim().min(1),
  keyId: z.string().trim().min(1).optional(),
  publicKey: z.string().trim().min(1),
  status: z.enum(["active", "revoked"]).default("active")
});

function normalizeKeyId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toRegistryKey(issuerId: string, keyId: string | undefined, publicKey: string): string {
  return `${issuerId}::${keyId ?? "public-key"}::${publicKey}`;
}

function parseConfiguredRegistryKeys(source: Record<string, string | undefined>): TrustedIssuerKey[] {
  const env = parseServerEnv(source);
  const raw = env.ADDON_TRUSTED_ISSUER_KEYS_JSON;

  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;

  return z.array(trustedIssuerKeySchema).parse(parsed).map((key) => ({
    issuerId: key.issuerId,
    keyId: normalizeKeyId(key.keyId),
    publicKey: key.publicKey,
    status: key.status,
    source: "registry"
  }));
}

export function listTrustedIssuerKeys(source: Record<string, string | undefined> = process.env): TrustedIssuerKey[] {
  const env = parseServerEnv(source);
  const keys = new Map<string, TrustedIssuerKey>();

  if (env.ADDON_ISSUER_PUBLIC_KEY) {
    const key: TrustedIssuerKey = {
      issuerId: env.ADDON_ISSUER_ID,
      publicKey: env.ADDON_ISSUER_PUBLIC_KEY,
      status: "active",
      source: "local-dev"
    };
    keys.set(toRegistryKey(key.issuerId, key.keyId, key.publicKey), key);
  }

  if (env.ADDON_MANAGED_ISSUER_PUBLIC_KEY) {
    const key: TrustedIssuerKey = {
      issuerId: env.ADDON_ISSUER_ID,
      keyId: normalizeKeyId(env.ADDON_MANAGED_SIGNER_KEY_ID),
      publicKey: env.ADDON_MANAGED_ISSUER_PUBLIC_KEY,
      status: "active",
      source: "managed"
    };
    keys.set(toRegistryKey(key.issuerId, key.keyId, key.publicKey), key);
  }

  for (const key of parseConfiguredRegistryKeys(source)) {
    keys.set(toRegistryKey(key.issuerId, key.keyId, key.publicKey), key);
  }

  return [...keys.values()];
}

export function resolveTrustedIssuerKey(addon: Addon, source: Record<string, string | undefined> = process.env): ResolveTrustedIssuerKeyResult {
  const issuerKeys = listTrustedIssuerKeys(source).filter((key) => key.issuerId === addon.issuerId);

  if (issuerKeys.length === 0) {
    return {
      ok: false,
      code: "VERIFY_UNTRUSTED_ISSUER",
      message: `Addon issuer \"${addon.issuerId}\" is not trusted by this server.`
    };
  }

  const proofKeyId = normalizeKeyId(addon.proof.keyId);
  const matchedKey =
    issuerKeys.find((key) => proofKeyId !== undefined && key.keyId === proofKeyId) ??
    issuerKeys.find((key) => key.publicKey === addon.proof.issuerPublicKey);

  if (!matchedKey) {
    return {
      ok: false,
      code: "VERIFY_UNTRUSTED_ISSUER",
      message: `Addon proof key ${proofKeyId ? `\"${proofKeyId}\" ` : ""}is not trusted for issuer \"${addon.issuerId}\".`
    };
  }

  if (matchedKey.status === "revoked") {
    return {
      ok: false,
      code: "VERIFY_REVOKED_ISSUER_KEY",
      message: `Addon proof key ${matchedKey.keyId ? `\"${matchedKey.keyId}\" ` : ""}for issuer \"${addon.issuerId}\" has been revoked.`
    };
  }

  return {
    ok: true,
    key: matchedKey
  };
}
