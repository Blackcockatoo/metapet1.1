import type { Addon, SignedAddonPayload } from "@bluesnake-studios/addon-core";
import { generateNonce } from "@bluesnake-studios/addon-crypto";

import { assertEditionWithinLimit } from "./edition-limits";
import { assertNonceUnused, assertNotExpired, rememberNonce } from "./replay-protection";
import type {
  BatchMintAddonsInput,
  MintAddonInput,
  MintAddonResult,
  MintTimeLimitedAddonInput
} from "./models";

function buildSignedPayload(input: MintAddonInput, issuedAt: string): SignedAddonPayload {
  return {
    id: input.addonId,
    templateId: input.template.id,
    category: input.template.category,
    rarity: input.template.rarity,
    edition: input.edition,
    ownerPublicKey: input.ownerPublicKey,
    issuerId: input.issuerId,
    metadata: input.metadata,
    nonce: input.nonce,
    issuedAt,
    expiresAt: input.expiresAt
  };
}

function buildAddon(input: MintAddonInput, payload: SignedAddonPayload, signature: string, signedAt: string): Addon {
  return {
    ...payload,
    editionLabel: `#${payload.edition}`,
    equipped: false,
    proof: {
      algorithm: "ECDSA_P256_SHA256",
      issuerPublicKey: input.issuerPublicKey,
      signature,
      signedAt,
      keyId: input.keyId
    }
  };
}

export async function mintAddon(input: MintAddonInput): Promise<MintAddonResult> {
  const issuedAt = input.issuedAt ?? new Date().toISOString();

  assertEditionWithinLimit(input.template, input.edition);
  await assertNonceUnused(input.nonce, input.replayGuard);
  assertNotExpired(input.expiresAt, new Date(issuedAt));

  const payload = buildSignedPayload(input, issuedAt);
  const signature = await input.sign(payload);
  const addon = buildAddon(input, payload, signature, issuedAt);

  await rememberNonce(input.nonce, input.replayGuard);

  return {
    addon,
    signedPayload: payload
  };
}

export async function batchMintAddons(input: BatchMintAddonsInput): Promise<MintAddonResult[]> {
  if (input.items.length === 0) {
    return [];
  }

  const issuedAt = input.issuedAt ?? new Date().toISOString();

  return Promise.all(
    input.items.map((item) =>
      mintAddon({
        addonId: item.addonId,
        template: input.template,
        edition: item.edition,
        ownerPublicKey: item.ownerPublicKey,
        issuerId: input.issuerId,
        issuerPublicKey: input.issuerPublicKey,
        metadata: item.metadata,
        nonce: input.generateNonce?.() ?? generateNonce(),
        issuedAt,
        expiresAt: input.expiresAt,
        sign: input.sign,
        replayGuard: input.replayGuard
      })
    )
  );
}

export async function mintTimeLimitedAddon(input: MintTimeLimitedAddonInput): Promise<MintAddonResult> {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const expiresAt = new Date(new Date(issuedAt).getTime() + input.ttlMs).toISOString();

  return mintAddon({
    ...input,
    issuedAt,
    expiresAt
  });
}
