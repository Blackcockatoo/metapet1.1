import type { TransferConsent } from "@bluesnake-studios/addon-core";
import { importPrivateKey, signCanonicalPayload } from "@bluesnake-studios/addon-crypto";

import { toReceiverAttestationPayload } from "@/lib/shared/receiver-attestation";

export interface CreateReceiverAttestationInput {
  requestId: string;
  addonId: string;
  fromOwnerPublicKey: string;
  toOwnerPublicKey: string;
  receiverPublicKey: string;
  issuedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  receiverPrivateKey: string;
}

export async function createSignedReceiverAttestation(input: CreateReceiverAttestationInput): Promise<TransferConsent> {
  const privateKey = await importPrivateKey(input.receiverPrivateKey.trim());

  const attestation: TransferConsent = {
    requestId: input.requestId,
    addonId: input.addonId,
    fromOwnerPublicKey: input.fromOwnerPublicKey,
    toOwnerPublicKey: input.toOwnerPublicKey,
    receiverPublicKey: input.receiverPublicKey,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    acceptedAt: input.acceptedAt ?? new Date().toISOString(),
    signature: ""
  };

  const signature = await signCanonicalPayload(toReceiverAttestationPayload(attestation), privateKey);

  return {
    ...attestation,
    signature
  };
}
