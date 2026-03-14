import { importPrivateKey, signCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import type { SignedAddonPayload } from "@bluesnake-studios/addon-core";
import { parseServerEnv, type ServerEnv } from "@bluesnake-studios/config";

export type CustodyMode = "local-dev" | "managed";

export interface IssuerSigner {
  issuerPublicKey: string;
  keyId?: string;
  sign(payload: SignedAddonPayload): Promise<string>;
  custodyMode: CustodyMode;
}

export type SignerInitErrorCode =
  | "SIGNER_MISCONFIGURED_KEY"
  | "SIGNER_MALFORMED_KEY"
  | "SIGNER_BACKEND_UNAVAILABLE"
  | "SIGNER_POLICY_VIOLATION";

export type SignerRuntimeErrorCode = "SIGNER_REQUEST_FAILED" | "SIGNER_BAD_RESPONSE";

export interface SignerInitError {
  code: SignerInitErrorCode;
  message: string;
  custodyMode: CustodyMode;
}

export class SignerRuntimeError extends Error {
  constructor(
    public readonly code: SignerRuntimeErrorCode,
    message: string,
    public readonly custodyMode: CustodyMode
  ) {
    super(message);
    this.name = "SignerRuntimeError";
  }
}

export type ResolveIssuerSignerResult =
  | {
      ok: true;
      signer: IssuerSigner;
    }
  | {
      ok: false;
      error: SignerInitError;
    };

interface ManagedSignerProvider {
  createSigner(env: ServerEnv): Promise<ResolveIssuerSignerResult>;
}

function isManagedSignerResponse(value: unknown): value is { signature: string; keyId: string; publicKey: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;

  return (
    typeof response.signature === "string" &&
    response.signature.length > 0 &&
    typeof response.keyId === "string" &&
    response.keyId.length > 0 &&
    typeof response.publicKey === "string" &&
    response.publicKey.length > 0
  );
}

async function buildRawPrivateKeySigner(
  custodyMode: CustodyMode,
  issuerPublicKey: string | undefined,
  issuerPrivateKey: string | undefined
): Promise<ResolveIssuerSignerResult> {
  if (!issuerPublicKey || !issuerPrivateKey) {
    return {
      ok: false,
      error: {
        code: "SIGNER_MISCONFIGURED_KEY",
        custodyMode,
        message: `Signer initialization failed for ${custodyMode}: issuer public/private key env vars are required.`
      }
    };
  }

  try {
    const privateKey = await importPrivateKey(issuerPrivateKey);

    return {
      ok: true,
      signer: {
        issuerPublicKey,
        keyId: undefined,
        custodyMode,
        sign(payload) {
          return signCanonicalPayload(payload, privateKey);
        }
      }
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "SIGNER_MALFORMED_KEY",
        custodyMode,
        message: `Signer initialization failed for ${custodyMode}: private key could not be parsed as a valid P-256 PKCS8 key.`
      }
    };
  }
}

async function buildHttpManagedSigner(env: ServerEnv): Promise<ResolveIssuerSignerResult> {
  if (!env.ADDON_MANAGED_SIGNER_ENDPOINT || !env.ADDON_MANAGED_SIGNER_KEY_ID || !env.ADDON_MANAGED_ISSUER_PUBLIC_KEY) {
    return {
      ok: false,
      error: {
        code: "SIGNER_MISCONFIGURED_KEY",
        custodyMode: "managed",
        message:
          "Signer initialization failed for managed custody: ADDON_MANAGED_SIGNER_ENDPOINT, ADDON_MANAGED_SIGNER_KEY_ID, and ADDON_MANAGED_ISSUER_PUBLIC_KEY are required."
      }
    };
  }

  if (env.ADDON_MANAGED_SIGNER_AUTH_MECHANISM === "bearer-token" && !env.ADDON_MANAGED_SIGNER_AUTH_TOKEN) {
    return {
      ok: false,
      error: {
        code: "SIGNER_MISCONFIGURED_KEY",
        custodyMode: "managed",
        message:
          "Signer initialization failed for managed custody: ADDON_MANAGED_SIGNER_AUTH_TOKEN is required when ADDON_MANAGED_SIGNER_AUTH_MECHANISM=bearer-token."
      }
    };
  }

  return {
    ok: true,
    signer: {
      issuerPublicKey: env.ADDON_MANAGED_ISSUER_PUBLIC_KEY,
      keyId: env.ADDON_MANAGED_SIGNER_KEY_ID,
      custodyMode: "managed",
      async sign(payload) {
        const headers: HeadersInit = {
          "Content-Type": "application/json"
        };

        if (env.ADDON_MANAGED_SIGNER_AUTH_MECHANISM === "bearer-token" && env.ADDON_MANAGED_SIGNER_AUTH_TOKEN) {
          headers.Authorization = `Bearer ${env.ADDON_MANAGED_SIGNER_AUTH_TOKEN}`;
        }

        let response: Response;

        try {
          response = await fetch(env.ADDON_MANAGED_SIGNER_ENDPOINT!, {
            method: "POST",
            headers,
            body: JSON.stringify({
              keyId: env.ADDON_MANAGED_SIGNER_KEY_ID,
              payload
            })
          });
        } catch (error) {
          throw new SignerRuntimeError(
            "SIGNER_REQUEST_FAILED",
            `Managed signer request failed: ${error instanceof Error ? error.message : "request could not be completed."}`,
            "managed"
          );
        }

        if (!response.ok) {
          throw new SignerRuntimeError("SIGNER_REQUEST_FAILED", `Managed signer request failed with status ${response.status}.`, "managed");
        }

        const data = await response.json().catch(() => undefined);

        if (!isManagedSignerResponse(data)) {
          throw new SignerRuntimeError("SIGNER_BAD_RESPONSE", "Managed signer response did not include signature, keyId, and publicKey fields.", "managed");
        }

        if (data.keyId !== env.ADDON_MANAGED_SIGNER_KEY_ID) {
          throw new SignerRuntimeError("SIGNER_BAD_RESPONSE", "Managed signer response keyId did not match the requested key ID.", "managed");
        }

        if (data.publicKey !== env.ADDON_MANAGED_ISSUER_PUBLIC_KEY) {
          throw new SignerRuntimeError("SIGNER_BAD_RESPONSE", "Managed signer response public key did not match the configured issuer public key.", "managed");
        }

        return data.signature;
      }
    }
  };
}

const managedSignerProviders: Record<string, ManagedSignerProvider> = {
  http: {
    createSigner(env) {
      return buildHttpManagedSigner(env);
    }
  }
};

async function resolveLocalDevSigner(env: ServerEnv): Promise<ResolveIssuerSignerResult> {
  return buildRawPrivateKeySigner("local-dev", env.ADDON_ISSUER_PUBLIC_KEY, env.ADDON_ISSUER_PRIVATE_KEY);
}

async function resolveManagedSigner(env: ServerEnv): Promise<ResolveIssuerSignerResult> {
  const backend = env.ADDON_MANAGED_SIGNER_BACKEND;
  const provider = managedSignerProviders[backend];

  if (!provider) {
    return {
      ok: false,
      error: {
        code: "SIGNER_BACKEND_UNAVAILABLE",
        custodyMode: "managed",
        message: `Signer initialization failed for managed custody: backend "${backend}" is unavailable.`
      }
    };
  }

  return provider.createSigner(env);
}

export async function resolveIssuerSigner(): Promise<ResolveIssuerSignerResult> {
  const env = parseServerEnv(process.env);

  if (env.NODE_ENV === "production" && env.ADDON_CUSTODY_PROVIDER !== "managed") {
    return {
      ok: false,
      error: {
        code: "SIGNER_POLICY_VIOLATION",
        custodyMode: "local-dev",
        message: "Signer initialization failed: production requires ADDON_CUSTODY_PROVIDER=managed."
      }
    };
  }

  if (env.ADDON_CUSTODY_PROVIDER === "managed") {
    return resolveManagedSigner(env);
  }

  return resolveLocalDevSigner(env);
}
