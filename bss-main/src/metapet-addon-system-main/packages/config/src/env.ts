import { z } from "zod";

const webEnvSchema = z.object({
  NEXT_PUBLIC_SITE_NAME: z.string().default("BlueSnake Studios Meta-Pet"),
  NEXT_PUBLIC_DEFAULT_OWNER_PUBLIC_KEY: z.string().default("demo-owner-public-key"),
  NEXT_PUBLIC_MOSS60_SHARE_BASE_URL: z.string().url().default("https://share.example.bluesnake.studio")
});

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_DATABASE_BACKEND: z.enum(["sqlite", "postgres"]).default("sqlite"),
  APP_DATABASE_URL: z.string().optional(),
  ADDON_ISSUER_ID: z.string().default("bluesnake-studios"),
  ADDON_ISSUER_PUBLIC_KEY: z.string().optional(),
  ADDON_ISSUER_PRIVATE_KEY: z.string().optional(),
  ADDON_TRUSTED_ISSUER_KEYS_JSON: z.string().optional(),
  MOSS60_SHARE_BASE_URL: z.string().url().optional(),
  ADMIN_API_TOKEN: z.string().optional(),
  TRANSFER_REQUIRE_RECEIVER_CONSENT: z.enum(["true", "false"]).default("false"),
  TRANSFER_REVOKED_RECEIVER_CONSENT_IDS_JSON: z.string().optional(),
  WALLET_DIRECT_TRANSFER_ENABLED: z.enum(["true", "false"]).default("false"),
  WALLET_SESSION_SECRET: z.string().optional(),
  WALLET_SESSION_TTL_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  WALLET_CHALLENGE_TTL_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),
  WALLET_TRANSFER_TTL_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),
  ADDON_CUSTODY_PROVIDER: z.enum(["local-dev", "managed"]).default("local-dev"),
  ADDON_MANAGED_SIGNER_BACKEND: z.string().default("http"),
  ADDON_MANAGED_SIGNER_ENDPOINT: z.string().url().optional(),
  ADDON_MANAGED_SIGNER_KEY_ID: z.string().optional(),
  ADDON_MANAGED_SIGNER_AUTH_MECHANISM: z.enum(["bearer-token", "none"]).default("bearer-token"),
  ADDON_MANAGED_SIGNER_AUTH_TOKEN: z.string().optional(),
  ADDON_MANAGED_ISSUER_PUBLIC_KEY: z.string().optional(),
  ADDON_MANAGED_ISSUER_PRIVATE_KEY: z.string().optional()
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseWebEnv(source: Record<string, string | undefined>): WebEnv {
  return webEnvSchema.parse(source);
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(source);
}
