import { bytesToBase64Url } from "./base64";

export function generateNonce(size = 18): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return bytesToBase64Url(bytes);
}
