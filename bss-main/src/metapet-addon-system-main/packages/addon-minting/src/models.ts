import type { Addon, AddonMetadata, AddonTemplate, SignedAddonPayload, TransferConsent } from "@bluesnake-studios/addon-core";

export interface ReplayGuard {
  has(nonce: string): boolean | Promise<boolean>;
  remember(nonce: string): void | Promise<void>;
}

export type MintSigner = (payload: SignedAddonPayload) => Promise<string>;

export interface MintAddonInput {
  addonId: string;
  template: AddonTemplate;
  edition: number;
  ownerPublicKey: string;
  issuerId: string;
  issuerPublicKey: string;
  metadata: AddonMetadata;
  nonce: string;
  issuedAt?: string;
  expiresAt?: string;
  keyId?: string;
  sign: MintSigner;
  replayGuard?: ReplayGuard;
}

export interface BatchMintItem {
  addonId: string;
  edition: number;
  ownerPublicKey: string;
  metadata: AddonMetadata;
}

export interface BatchMintAddonsInput {
  template: AddonTemplate;
  issuerId: string;
  issuerPublicKey: string;
  items: BatchMintItem[];
  sign: MintSigner;
  generateNonce?: () => string;
  issuedAt?: string;
  expiresAt?: string;
  replayGuard?: ReplayGuard;
}

export interface MintTimeLimitedAddonInput extends Omit<MintAddonInput, "expiresAt"> {
  ttlMs: number;
}

export interface MintAddonResult {
  addon: Addon;
  signedPayload: SignedAddonPayload;
}

export interface TransferDraft {
  addonId: string;
  fromOwnerPublicKey: string;
  toOwnerPublicKey: string;
  nonce: string;
  issuedAt: string;
  expiresAt?: string;
  receiverConsent?: TransferConsent;
}

export interface TransferReceiverVerificationOptions {
  requireReceiverConsent?: boolean;
}
