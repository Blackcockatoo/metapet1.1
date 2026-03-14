function toUint8Array(value: ArrayBuffer | Uint8Array): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

export function bytesToArrayBuffer(value: ArrayBuffer | Uint8Array): ArrayBuffer {
  const bytes = toUint8Array(value);
  return Uint8Array.from(bytes).buffer;
}

export function bytesToBase64(value: ArrayBuffer | Uint8Array): string {
  const bytes = toUint8Array(value);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function base64ToBase64Url(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBase64(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;

  if (padding === 0) {
    return normalized;
  }

  return normalized.padEnd(normalized.length + (4 - padding), "=");
}

export function bytesToBase64Url(value: ArrayBuffer | Uint8Array): string {
  return base64ToBase64Url(bytesToBase64(value));
}

export function base64UrlToBytes(value: string): Uint8Array {
  return base64ToBytes(base64UrlToBase64(value));
}
