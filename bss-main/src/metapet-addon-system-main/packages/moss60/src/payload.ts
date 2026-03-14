import type { Addon } from "@bluesnake-studios/addon-core";
import { bytesToBase64Url, base64UrlToBytes } from "@bluesnake-studios/addon-crypto";

import { digestValue } from "./hash";
import type { Moss60VerifiablePayload } from "./types";

export async function createMoss60VerifiablePayload(
  addon: Addon,
  options: { createdAt?: string; expiresAt?: string } = {}
): Promise<Moss60VerifiablePayload> {
  return {
    metadata: {
      schema: "moss60/share/v1",
      createdAt: options.createdAt ?? new Date().toISOString(),
      expiresAt: options.expiresAt,
      digestAlgorithm: "SHA-256"
    },
    addon,
    addonDigest: await digestValue(addon)
  };
}

export function encodeMoss60Payload(payload: Moss60VerifiablePayload): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeMoss60Payload(encodedPayload: string): Moss60VerifiablePayload {
  const json = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
  return JSON.parse(json) as Moss60VerifiablePayload;
}

export function createShareUrl(baseUrl: string, payload: Moss60VerifiablePayload): string {
  const url = new URL(baseUrl);
  url.searchParams.set("payload", encodeMoss60Payload(payload));
  return url.toString();
}
