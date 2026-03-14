import { base64ToBytes, bytesToArrayBuffer, bytesToBase64 } from "./base64";

export async function generateAddonKeypair(extractable = true): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    extractable,
    ["sign", "verify"]
  );
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return bytesToBase64(exported);
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  return bytesToBase64(exported);
}

export async function importPublicKey(serializedKey: string): Promise<CryptoKey> {
  const keyData = base64ToBytes(serializedKey);

  return crypto.subtle.importKey(
    "spki",
    bytesToArrayBuffer(keyData),
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ["verify"]
  );
}

export async function importPrivateKey(serializedKey: string): Promise<CryptoKey> {
  const keyData = base64ToBytes(serializedKey);

  return crypto.subtle.importKey(
    "pkcs8",
    bytesToArrayBuffer(keyData),
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    false,
    ["sign"]
  );
}
