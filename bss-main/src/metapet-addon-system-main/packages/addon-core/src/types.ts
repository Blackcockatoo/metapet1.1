import type { AddonCategory, AddonRarity } from "./enums";

export type MetadataValue = boolean | number | string;

export interface EditionLimit {
  policy: "capped" | "open";
  maxEditions?: number;
}

export interface MetadataFieldDefinition {
  key: string;
  label: string;
  valueType: "boolean" | "enum" | "number" | "string";
  required: boolean;
  allowedValues?: string[];
  description?: string;
}

export interface AddonMetadataModel {
  tags: string[];
  fields: MetadataFieldDefinition[];
}

export interface AddonMetadata {
  title: string;
  description: string;
  imageUrl?: string;
  traits: Record<string, MetadataValue>;
}

export interface TransferConsent {
  requestId: string;
  addonId: string;
  fromOwnerPublicKey: string;
  toOwnerPublicKey: string;
  receiverPublicKey: string;
  issuedAt: string;
  expiresAt: string;
  acceptedAt: string;
  signature: string;
}

export interface AddonTemplate {
  id: string;
  collection: "moss60";
  name: string;
  slug: string;
  category: AddonCategory;
  rarity: AddonRarity;
  editionLimit: EditionLimit;
  metadataModel: AddonMetadataModel;
  previewText: string;
}

export interface SignedAddonPayload {
  id: string;
  templateId: string;
  category: AddonCategory;
  rarity: AddonRarity;
  edition: number;
  ownerPublicKey: string;
  issuerId: string;
  metadata: AddonMetadata;
  nonce: string;
  issuedAt: string;
  expiresAt?: string;
}

export interface AddonProof {
  algorithm: "ECDSA_P256_SHA256";
  issuerPublicKey: string;
  signature: string;
  signedAt: string;
  keyId?: string;
}

export interface Addon extends SignedAddonPayload {
  editionLabel: string;
  proof: AddonProof;
  equipped: boolean;
  equippedAt?: string;
}

export interface AddonTemplateRegistry {
  byId: Record<string, AddonTemplate>;
  ids: string[];
}

export function toSignedAddonPayload(addon: Addon): SignedAddonPayload {
  return {
    id: addon.id,
    templateId: addon.templateId,
    category: addon.category,
    rarity: addon.rarity,
    edition: addon.edition,
    ownerPublicKey: addon.ownerPublicKey,
    issuerId: addon.issuerId,
    metadata: addon.metadata,
    nonce: addon.nonce,
    issuedAt: addon.issuedAt,
    expiresAt: addon.expiresAt
  };
}
