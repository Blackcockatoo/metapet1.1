import type { TransferDraft, TransferReceiverVerificationOptions } from "./models";
import { assertNotExpired, isExpired } from "./replay-protection";

export function verifyTransferReceiver(
  draft: TransferDraft,
  options: TransferReceiverVerificationOptions = {}
): void {
  if (!draft.receiverConsent) {
    if (options.requireReceiverConsent) {
      throw new Error("Receiver consent is required for this transfer.");
    }

    return;
  }

  if (draft.receiverConsent.receiverPublicKey !== draft.toOwnerPublicKey) {
    throw new Error("Receiver consent must match the destination owner public key.");
  }
}

export function createTransferDraft(
  draft: TransferDraft,
  options: TransferReceiverVerificationOptions = {}
): TransferDraft {
  assertNotExpired(draft.expiresAt, new Date(draft.issuedAt));
  verifyTransferReceiver(draft, options);
  return draft;
}

export function isTransferExpired(draft: TransferDraft, now = new Date()): boolean {
  return isExpired(draft.expiresAt, now);
}
