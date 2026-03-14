import type { Addon } from "@bluesnake-studios/addon-core";

export interface Moss60PayloadMetadata {
  schema: "moss60/share/v1";
  createdAt: string;
  expiresAt?: string;
  digestAlgorithm: "SHA-256";
}

export interface Moss60VerifiablePayload {
  metadata: Moss60PayloadMetadata;
  addon: Addon;
  addonDigest: string;
}
