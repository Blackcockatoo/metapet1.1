import { addonMetadataSchema, getAddonTemplate } from "@bluesnake-studios/addon-core";
import { mintTimeLimitedAddon } from "@bluesnake-studios/addon-minting";
import { MINTING_CONSTANTS, parseServerEnv } from "@bluesnake-studios/config";
import { ZodError, z } from "zod";

import { resolveIssuerSigner } from "@/lib/server/custody-signer";
import { appendOwnedAddon } from "@/lib/server/inventory-repository";

const mintRequestSchema = z.object({
  templateId: z.string().min(1),
  addonId: z.string().min(1),
  edition: z.number().int().positive(),
  ownerPublicKey: z.string().min(1),
  metadata: addonMetadataSchema
});

export type MintAddonInput = z.infer<typeof mintRequestSchema>;

function isSignerRuntimeFailure(
  error: unknown
): error is Error & {
  code: "SIGNER_REQUEST_FAILED" | "SIGNER_BAD_RESPONSE" | "MANAGED_SIGNER_TIMEOUT" | "MANAGED_SIGNER_HTTP_ERROR";
  custodyMode?: "local-dev" | "managed";
  status?: number;
} {
  const runtimeError = error as (Error & { code?: unknown; custodyMode?: unknown; status?: unknown }) | null;

  return (
    error instanceof Error &&
    (runtimeError?.code === "SIGNER_REQUEST_FAILED" ||
      runtimeError?.code === "SIGNER_BAD_RESPONSE" ||
      runtimeError?.code === "MANAGED_SIGNER_TIMEOUT" ||
      runtimeError?.code === "MANAGED_SIGNER_HTTP_ERROR") &&
    (runtimeError?.custodyMode === undefined || runtimeError?.custodyMode === "local-dev" || runtimeError?.custodyMode === "managed")
  );
}

function toSignerRuntimeStatus(error: { code: string; status?: number }): number {
  if (error.code === "MANAGED_SIGNER_TIMEOUT") {
    return 504;
  }

  if (typeof error.status === "number" && error.status >= 400 && error.status < 600) {
    return error.status === 504 ? 504 : 502;
  }

  return 502;
}

export async function issueMintedAddon(payload: MintAddonInput) {
  const signerResolution = await resolveIssuerSigner();
  const env = parseServerEnv(process.env);

  if (!signerResolution) {
    return {
      status: 501,
      body: {
        code: "SIGNER_UNAVAILABLE",
        error: "Issuer signer is not available."
      }
    };
  }

  if (!signerResolution.ok) {
    return {
      status: 501,
      body: {
        error: signerResolution.error.message,
        code: signerResolution.error.code,
        custodyMode: signerResolution.error.custodyMode
      }
    };
  }

  const signer = signerResolution.signer;
  const template = getAddonTemplate(payload.templateId);

  if (!template) {
    return {
      status: 404,
      body: {
        code: "TEMPLATE_NOT_FOUND",
        error: "Template not found."
      }
    };
  }

  let minted: Awaited<ReturnType<typeof mintTimeLimitedAddon>>;

  try {
    minted = await mintTimeLimitedAddon({
      addonId: payload.addonId,
      template,
      edition: payload.edition,
      ownerPublicKey: payload.ownerPublicKey,
      issuerId: env.ADDON_ISSUER_ID,
      issuerPublicKey: signer.issuerPublicKey,
      metadata: payload.metadata,
      nonce: crypto.randomUUID(),
      ttlMs: MINTING_CONSTANTS.defaultMintTtlMs,
      keyId: signer.keyId,
      sign: signer.sign
    });
    } catch (error) {
    if (isSignerRuntimeFailure(error)) {
      return {
        status: toSignerRuntimeStatus(error),
        body: {
          error: error.message,
          code: error.code,
          custodyMode: error.custodyMode ?? signer.custodyMode
        }
      };
    }

    throw error;
  }

  return {
    status: 200,
    body: {
      addon: minted.addon,
      custodyMode: signer.custodyMode
    }
  };
}

export async function mintAddonFromRequest(body: unknown) {
  let payload: MintAddonInput;

  try {
    payload = mintRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        status: 400,
        body: {
          code: "MINT_PAYLOAD_INVALID",
          error: "Mint payload failed schema validation.",
          issues: error.issues
        }
      };
    }

    throw error;
  }

  const minted = await issueMintedAddon(payload);

  if (minted.status !== 200 || !("addon" in minted.body)) {
    return minted;
  }

  const addon = minted.body.addon;

  if (!addon) {
    throw new Error("Minted addon missing from successful response.");
  }

  await appendOwnedAddon(payload.ownerPublicKey, addon);

  return minted;
}
