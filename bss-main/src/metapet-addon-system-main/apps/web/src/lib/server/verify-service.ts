import { ZodError } from "zod";
import { parseAddon, toSignedAddonPayload } from "@bluesnake-studios/addon-core";
import { verifySignedAddonPayload } from "@bluesnake-studios/addon-crypto";

import { resolveTrustedIssuerKey } from "@/lib/server/issuer-key-registry";

export async function verifyAddonFromRequest(body: unknown) {
  let addon;

  try {
    addon = parseAddon(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        status: 400,
        body: {
          code: "VERIFY_PAYLOAD_INVALID",
          message: "Addon payload failed schema validation.",
          issues: error.issues
        }
      };
    }

    throw error;
  }

  const trustedKey = resolveTrustedIssuerKey(addon);

  if (!trustedKey.ok) {
    return {
      status: trustedKey.code === "VERIFY_REVOKED_ISSUER_KEY" ? 409 : 401,
      body: {
        code: trustedKey.code,
        message: trustedKey.message,
        verified: false
      }
    };
  }

  const verified = await verifySignedAddonPayload(
    toSignedAddonPayload(addon),
    addon.proof.signature,
    trustedKey.key.publicKey
  );

  if (!verified) {
    return {
      status: 401,
      body: {
        code: "VERIFY_INVALID_SIGNATURE",
        message: "Addon signature verification failed.",
        verified: false
      }
    };
  }

  return {
    status: 200,
    body: {
      verified: true,
      issuerId: addon.issuerId,
      signerKeyId: trustedKey.key.keyId
    }
  };
}
