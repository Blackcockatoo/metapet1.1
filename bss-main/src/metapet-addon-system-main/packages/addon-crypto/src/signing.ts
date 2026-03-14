import type { SignedAddonPayload } from "@bluesnake-studios/addon-core";

import { canonicalSerialize } from "./canonical";
import { base64ToBytes, bytesToArrayBuffer, bytesToBase64 } from "./base64";
import { importPublicKey } from "./keypair";

const textEncoder = new TextEncoder();

export async function signBytes(payload: Uint8Array, privateKey: CryptoKey): Promise<string> {
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256"
    },
    privateKey,
    bytesToArrayBuffer(payload)
  );

  return bytesToBase64(signature);
}

export async function verifyBytes(
  payload: Uint8Array,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  const signatureBytes = base64ToBytes(signature);

  return crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: "SHA-256"
    },
    publicKey,
    bytesToArrayBuffer(signatureBytes),
    bytesToArrayBuffer(payload)
  );
}

export async function signCanonicalPayload(payload: unknown, privateKey: CryptoKey): Promise<string> {
  return signBytes(textEncoder.encode(canonicalSerialize(payload)), privateKey);
}

export async function verifyCanonicalPayload(
  payload: unknown,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  return verifyBytes(textEncoder.encode(canonicalSerialize(payload)), signature, publicKey);
}

export async function verifySignedAddonPayload(
  payload: SignedAddonPayload,
  signature: string,
  serializedPublicKey: string
): Promise<boolean> {
  const publicKey = await importPublicKey(serializedPublicKey);
  return verifyCanonicalPayload(payload, signature, publicKey);
}
