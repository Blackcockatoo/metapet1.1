import { createTransferDraft } from "@bluesnake-studios/addon-minting";
import { runAppDatabaseTransaction } from "@/lib/server/app-database-adapter";
import { transferOwnedAddon } from "@/lib/server/inventory-repository";
import { ReceiverAttestationError, validateReceiverAttestation } from "@/lib/server/receiver-attestation";
import { adminTransferSchema, consumeTransferReplayRequest, transferRequestSchema, verifyTransferRequestSignature } from "@/lib/server/transfer-verifier";

export const TRANSFER_ERROR_CODES = {
  unauthorizedRequester: "UNAUTHORIZED_REQUESTER",
  invalidParticipants: "INVALID_TRANSFER_PARTICIPANTS",
  invalidSignature: "INVALID_TRANSFER_SIGNATURE",
  replayedRequest: "REPLAYED_TRANSFER_REQUEST",
  expiredRequest: "EXPIRED_TRANSFER_REQUEST",
  addonNotFound: "ADDON_NOT_FOUND",
  receiverConsentRequired: "RECEIVER_CONSENT_REQUIRED",
  invalidReceiverConsent: "INVALID_RECEIVER_CONSENT",
  revokedReceiverConsent: "REVOKED_RECEIVER_CONSENT",
  expiredReceiverConsent: "EXPIRED_RECEIVER_CONSENT"
} as const;

export interface TransferRequestContext {
  requesterId: string;
  isAdmin?: boolean;
  requireReceiverConsent?: boolean;
}

function toReceiverConsentFailure(error: unknown) {
  if (error instanceof ReceiverAttestationError) {
    if (error.code === "RECEIVER_ATTESTATION_REQUIRED") {
      return {
        status: 400,
        body: {
          errorCode: TRANSFER_ERROR_CODES.receiverConsentRequired,
          error: error.message
        }
      };
    }

    if (error.code === "RECEIVER_ATTESTATION_REVOKED") {
      return {
        status: 409,
        body: {
          errorCode: TRANSFER_ERROR_CODES.revokedReceiverConsent,
          error: error.message
        }
      };
    }

    if (error.code === "RECEIVER_ATTESTATION_EXPIRED") {
      return {
        status: 409,
        body: {
          errorCode: TRANSFER_ERROR_CODES.expiredReceiverConsent,
          error: error.message
        }
      };
    }

    return {
      status: 400,
      body: {
        errorCode: TRANSFER_ERROR_CODES.invalidReceiverConsent,
        error: error.message
      }
    };
  }

  const message = error instanceof Error ? error.message : "Receiver consent validation failed.";

  if (message === "Receiver consent is required for this transfer.") {
    return {
      status: 400,
      body: {
        errorCode: TRANSFER_ERROR_CODES.receiverConsentRequired,
        error: message
      }
    };
  }

  return {
    status: 400,
    body: {
      errorCode: TRANSFER_ERROR_CODES.invalidReceiverConsent,
      error: message
    }
  };
}

export async function transferAddonFromRequest(body: unknown, context: TransferRequestContext) {
  if (!context.isAdmin) {
    return {
      status: 403,
      body: {
        errorCode: TRANSFER_ERROR_CODES.unauthorizedRequester,
        error: "Requester is not authorized to execute transfers."
      }
    };
  }

  // Admin path: accept { addonId, fromOwnerPublicKey, toOwnerPublicKey } without a
  // signature when the request already carries admin authority (token verified by
  // requireAdminSession before this function is called). Admin-authorized
  // owner-signed transfers are handled below when the body includes the signed
  // contract fields.
  const hasSignature = typeof body === "object" && body !== null && "signature" in body;

  if (hasSignature) {
    // Admin-authorized owner-signed path: parse and verify the full signed contract.
    const payload = transferRequestSchema.parse(body);

    if (payload.fromOwnerPublicKey === payload.toOwnerPublicKey) {
      return {
        status: 400,
        body: {
          errorCode: TRANSFER_ERROR_CODES.invalidParticipants,
          error: "fromOwnerPublicKey and toOwnerPublicKey must be different."
        }
      };
    }

    const verification = await verifyTransferRequestSignature(payload);

    if (!verification.ok) {
      if (verification.reason === "invalid_signature") {
        return {
          status: 401,
          body: {
            errorCode: TRANSFER_ERROR_CODES.invalidSignature,
            error: "Transfer signature is invalid."
          }
        };
      }

      return {
        status: 409,
        body: {
          errorCode: TRANSFER_ERROR_CODES.expiredRequest,
          error: "Transfer request has expired."
        }
      };
    }

    try {
      await validateReceiverAttestation(payload.receiverConsent, {
        addonId: payload.addonId,
        fromOwnerPublicKey: payload.fromOwnerPublicKey,
        toOwnerPublicKey: payload.toOwnerPublicKey,
        requireReceiverConsent: context.requireReceiverConsent
      });

      createTransferDraft(
        {
          addonId: payload.addonId,
          fromOwnerPublicKey: payload.fromOwnerPublicKey,
          toOwnerPublicKey: payload.toOwnerPublicKey,
          nonce: payload.nonce,
          issuedAt: new Date(payload.timestampMs).toISOString(),
          expiresAt: new Date(payload.timestampMs + payload.ttlMs).toISOString(),
          receiverConsent: payload.receiverConsent
        },
        { requireReceiverConsent: context.requireReceiverConsent }
      );
    } catch (error) {
      return toReceiverConsentFailure(error);
    }

    const transferred = await runAppDatabaseTransaction(async (transaction) => {
      const replayStatus = await consumeTransferReplayRequest(payload, Date.now(), transaction);

      if (!replayStatus.ok) {
        return replayStatus.reason;
      }

      return transferOwnedAddon(payload.addonId, payload.fromOwnerPublicKey, payload.toOwnerPublicKey, transaction);
    });

    if (transferred === "replay" || transferred === "expired") {
      return {
        status: 409,
        body: {
          errorCode: transferred === "replay" ? TRANSFER_ERROR_CODES.replayedRequest : TRANSFER_ERROR_CODES.expiredRequest,
          error: transferred === "replay" ? "Transfer request nonce has already been used." : "Transfer request has expired."
        }
      };
    }

    if (!transferred) {
      return {
        status: 404,
        body: {
          errorCode: TRANSFER_ERROR_CODES.addonNotFound,
          error: "Addon not found for the source owner."
        }
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        addonId: payload.addonId,
        fromOwnerPublicKey: payload.fromOwnerPublicKey,
        toOwnerPublicKey: payload.toOwnerPublicKey,
        nonce: payload.nonce,
        timestampMs: payload.timestampMs,
        ttlMs: payload.ttlMs
      }
    };
  }

  // Admin-authorized unsigned path: no owner signature required.
  const payload = adminTransferSchema.parse(body);

  if (payload.fromOwnerPublicKey === payload.toOwnerPublicKey) {
    return {
      status: 400,
      body: {
        errorCode: TRANSFER_ERROR_CODES.invalidParticipants,
        error: "fromOwnerPublicKey and toOwnerPublicKey must be different."
      }
    };
  }

  try {
    await validateReceiverAttestation(payload.receiverConsent, {
      addonId: payload.addonId,
      fromOwnerPublicKey: payload.fromOwnerPublicKey,
      toOwnerPublicKey: payload.toOwnerPublicKey,
      requireReceiverConsent: context.requireReceiverConsent
    });

    createTransferDraft(
      {
        addonId: payload.addonId,
        fromOwnerPublicKey: payload.fromOwnerPublicKey,
        toOwnerPublicKey: payload.toOwnerPublicKey,
        nonce: `admin-${payload.addonId}`,
        issuedAt: new Date().toISOString(),
        receiverConsent: payload.receiverConsent
      },
      { requireReceiverConsent: context.requireReceiverConsent }
    );
  } catch (error) {
    return toReceiverConsentFailure(error);
  }

  const transferred = await runAppDatabaseTransaction((transaction) =>
    transferOwnedAddon(payload.addonId, payload.fromOwnerPublicKey, payload.toOwnerPublicKey, transaction)
  );

  if (!transferred) {
    return {
      status: 404,
      body: {
        errorCode: TRANSFER_ERROR_CODES.addonNotFound,
        error: "Addon not found for the source owner."
      }
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      addonId: payload.addonId,
      fromOwnerPublicKey: payload.fromOwnerPublicKey,
      toOwnerPublicKey: payload.toOwnerPublicKey
    }
  };
}
