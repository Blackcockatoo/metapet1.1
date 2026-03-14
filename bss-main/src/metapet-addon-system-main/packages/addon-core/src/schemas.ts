import { z } from "zod";

import { addonCategories, addonRarities } from "./enums";
import type { Addon, AddonTemplate, SignedAddonPayload } from "./types";

export const metadataValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const editionLimitSchema = z.object({
  policy: z.enum(["capped", "open"]),
  maxEditions: z.number().int().positive().optional()
});

export const metadataFieldDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  valueType: z.enum(["boolean", "enum", "number", "string"]),
  required: z.boolean(),
  allowedValues: z.array(z.string()).optional(),
  description: z.string().optional()
});

export const addonMetadataModelSchema = z.object({
  tags: z.array(z.string()),
  fields: z.array(metadataFieldDefinitionSchema)
});

export const addonMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().url().optional(),
  traits: z.record(z.string(), metadataValueSchema)
});

export const addonTemplateSchema = z.object({
  id: z.string().min(1),
  collection: z.literal("moss60"),
  name: z.string().min(1),
  slug: z.string().min(1),
  category: z.enum(addonCategories),
  rarity: z.enum(addonRarities),
  editionLimit: editionLimitSchema,
  metadataModel: addonMetadataModelSchema,
  previewText: z.string().min(1)
}) satisfies z.ZodType<AddonTemplate>;

export const signedAddonPayloadSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  category: z.enum(addonCategories),
  rarity: z.enum(addonRarities),
  edition: z.number().int().positive(),
  ownerPublicKey: z.string().min(1),
  issuerId: z.string().min(1),
  metadata: addonMetadataSchema,
  nonce: z.string().min(8),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional()
}) satisfies z.ZodType<SignedAddonPayload>;

export const addonProofSchema = z.object({
  algorithm: z.literal("ECDSA_P256_SHA256"),
  issuerPublicKey: z.string().min(1),
  signature: z.string().min(1),
  signedAt: z.string().datetime(),
  keyId: z.string().optional()
});

export const addonSchema = signedAddonPayloadSchema.extend({
  editionLabel: z.string().min(1),
  proof: addonProofSchema,
  equipped: z.boolean(),
  equippedAt: z.string().datetime().optional()
}) satisfies z.ZodType<Addon>;

export function parseAddon(value: unknown): Addon {
  return addonSchema.parse(value);
}

export function parseAddonTemplate(value: unknown): AddonTemplate {
  return addonTemplateSchema.parse(value);
}

export function parseSignedAddonPayload(value: unknown): SignedAddonPayload {
  return signedAddonPayloadSchema.parse(value);
}
