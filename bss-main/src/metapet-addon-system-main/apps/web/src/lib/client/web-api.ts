import type { Addon, AddonMetadata, TransferConsent } from "@bluesnake-studios/addon-core";
import type { AddonStoreSnapshot } from "@bluesnake-studios/addon-store";

import { parseApiError } from "@/lib/client/api-error";
import type { AuditEventRecord, ReplayNonceRecord } from "@/lib/server/operations-store";
import type {
  WalletSessionChallengeRequest,
  WalletSessionChallengeResponse,
  WalletSessionVerifyRequest,
  WalletSessionVerifyResponse
} from "@/lib/shared/wallet-session-contract";
import type {
  WalletTransferPrepareRequest,
  WalletTransferPrepareResponse,
  WalletTransferSubmitRequest,
  WalletTransferSubmitResponse
} from "@/lib/shared/wallet-transfer-contract";
import type { StorefrontListing, StorefrontOrder } from "@/lib/storefront/types";

export type {
  WalletSessionChallengeRequest,
  WalletSessionChallengeResponse,
  WalletSessionVerifyRequest,
  WalletSessionVerifyResponse,
} from "@/lib/shared/wallet-session-contract";

export type {
  WalletTransferPrepareRequest,
  WalletTransferPrepareResponse,
  WalletTransferSubmitRequest,
  WalletTransferSubmitResponse
} from "@/lib/shared/wallet-transfer-contract";

export interface AdminRequestOptions {
  adminActor?: string;
  adminToken: string;
}

export interface WalletSessionRequestOptions {
  sessionToken: string;
}

export interface WalletSessionRevokeResponse {
  ok: true;
  revoked: true;
  sessionId: string;
}

export interface PurchaseListingInput {
  listingId: string;
  ownerPublicKey: string;
}

export interface MintAddonInput {
  templateId: string;
  addonId: string;
  edition: number;
  ownerPublicKey: string;
  metadata: AddonMetadata;
}

/**
 * Admin-authorized unsigned transfer.  Requires a valid `x-admin-token` on the
 * request; no owner signature is needed because admin authority is the trust boundary.
 * This is the contract accepted by `POST /api/transfer` when called from the admin
 * console or inventory UI.
 */
export interface TransferAddonInput {
  addonId: string;
  fromOwnerPublicKey: string;
  toOwnerPublicKey: string;
  receiverConsent?: TransferConsent;
}

/**
 * Owner-signed transfer contract for the current admin-only `POST /api/transfer` route.
 * This adds source-owner consent proof and replay protection on top of admin
 * authorization. Direct non-admin wallet submission is deferred for now and
 * not part of the public route surface.
 */
export interface SignedTransferAddonInput extends TransferAddonInput {
  nonce: string;
  timestampMs: number;
  ttlMs: number;
  signature: string;
}

export interface UpdateListingInput {
  listingId: string;
  priceCents: number;
  status: StorefrontListing["status"];
  visibility: StorefrontListing["visibility"];
  badge: string;
}

export interface PurchaseListingResponse {
  ok: true;
  order: StorefrontOrder;
  addon: Addon;
  listing: StorefrontListing;
}

export interface MintAddonResponse {
  addon: Addon;
  custodyMode: StorefrontOrder["custodyMode"];
}

export interface TransferAddonResponse {
  ok: true;
  addonId: string;
  fromOwnerPublicKey: string;
  toOwnerPublicKey: string;
  /** Present only when a signed transfer contract was submitted. */
  nonce?: string;
  timestampMs?: number;
  ttlMs?: number;
}

export interface UpdateListingResponse {
  listing: StorefrontListing;
}

export interface InventoryResponse {
  snapshot: AddonStoreSnapshot | null;
}

export interface AdminActivityResponse {
  auditEvents: AuditEventRecord[];
  orders: StorefrontOrder[];
  replayNonces: ReplayNonceRecord[];
}

export interface AdminActivityQuery {
  actorId?: string;
  auditAction?: AuditEventRecord["action"];
  auditStatus?: AuditEventRecord["status"];
  limit?: number;
  replayOperation?: string;
  replayStatus?: ReplayNonceRecord["status"];
  orderListingId?: string;
  orderOwnerPublicKey?: string;
  scopeKey?: string;
  search?: string;
}

function createAdminHeaders(options: AdminRequestOptions): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-admin-token": options.adminToken,
    "x-admin-actor": options.adminActor ?? "admin"
  };
}

function createWalletSessionHeaders(options: WalletSessionRequestOptions): HeadersInit {
  return {
    "Content-Type": "application/json",
    authorization: `Bearer ${options.sessionToken}`
  };
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function loadInventorySnapshot(ownerPublicKey: string): Promise<AddonStoreSnapshot | undefined> {
  const payload = await requestJson<InventoryResponse>(`/api/inventory?ownerPublicKey=${encodeURIComponent(ownerPublicKey)}`);
  return payload.snapshot ?? undefined;
}

export async function saveInventorySnapshot(ownerPublicKey: string, snapshot: AddonStoreSnapshot): Promise<void> {
  await requestJson<{ ok: true }>("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerPublicKey, snapshot })
  });
}

export async function clearInventorySnapshot(ownerPublicKey: string): Promise<void> {
  await requestJson<{ ok: true }>(`/api/inventory?ownerPublicKey=${encodeURIComponent(ownerPublicKey)}`, {
    method: "DELETE"
  });
}

export function purchaseListing(input: PurchaseListingInput): Promise<PurchaseListingResponse> {
  return requestJson<PurchaseListingResponse>("/api/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function mintAddon(input: MintAddonInput, admin: AdminRequestOptions): Promise<MintAddonResponse> {
  return requestJson<MintAddonResponse>("/api/mint", {
    method: "POST",
    headers: createAdminHeaders(admin),
    body: JSON.stringify(input)
  });
}

export function transferAddon(input: TransferAddonInput | SignedTransferAddonInput, admin: AdminRequestOptions): Promise<TransferAddonResponse> {
  return requestJson<TransferAddonResponse>("/api/transfer", {
    method: "POST",
    headers: createAdminHeaders(admin),
    body: JSON.stringify(input)
  });
}

export function issueWalletSessionChallenge(input: WalletSessionChallengeRequest): Promise<WalletSessionChallengeResponse> {
  return requestJson<WalletSessionChallengeResponse>("/api/wallet-session/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function verifyWalletSession(input: WalletSessionVerifyRequest): Promise<WalletSessionVerifyResponse> {
  return requestJson<WalletSessionVerifyResponse>("/api/wallet-session/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function revokeWalletSession(session: WalletSessionRequestOptions): Promise<WalletSessionRevokeResponse> {
  return requestJson<WalletSessionRevokeResponse>("/api/wallet-session/revoke", {
    method: "POST",
    headers: createWalletSessionHeaders(session)
  });
}

export function prepareWalletTransfer(
  input: WalletTransferPrepareRequest,
  session: WalletSessionRequestOptions
): Promise<WalletTransferPrepareResponse> {
  return requestJson<WalletTransferPrepareResponse>("/api/wallet-transfer/prepare", {
    method: "POST",
    headers: createWalletSessionHeaders(session),
    body: JSON.stringify(input)
  });
}

export function submitWalletTransfer(
  input: WalletTransferSubmitRequest,
  session: WalletSessionRequestOptions
): Promise<WalletTransferSubmitResponse> {
  return requestJson<WalletTransferSubmitResponse>("/api/wallet-transfer/submit", {
    method: "POST",
    headers: createWalletSessionHeaders(session),
    body: JSON.stringify(input)
  });
}

export function updateListing(input: UpdateListingInput, admin: AdminRequestOptions): Promise<UpdateListingResponse> {
  return requestJson<UpdateListingResponse>("/api/listings", {
    method: "POST",
    headers: createAdminHeaders(admin),
    body: JSON.stringify(input)
  });
}

export function listAdminActivity(admin: AdminRequestOptions, query: AdminActivityQuery = {}): Promise<AdminActivityResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(query.limit ?? 20));

  if (query.actorId) {
    searchParams.set("actorId", query.actorId);
  }

  if (query.auditAction) {
    searchParams.set("auditAction", query.auditAction);
  }

  if (query.auditStatus) {
    searchParams.set("auditStatus", query.auditStatus);
  }

  if (query.replayOperation) {
    searchParams.set("replayOperation", query.replayOperation);
  }

  if (query.replayStatus) {
    searchParams.set("replayStatus", query.replayStatus);
  }

  if (query.orderListingId) {
    searchParams.set("orderListingId", query.orderListingId);
  }

  if (query.orderOwnerPublicKey) {
    searchParams.set("orderOwnerPublicKey", query.orderOwnerPublicKey);
  }

  if (query.scopeKey) {
    searchParams.set("scopeKey", query.scopeKey);
  }

  if (query.search) {
    searchParams.set("search", query.search);
  }

  return requestJson<AdminActivityResponse>(`/api/admin/activity?${searchParams.toString()}`, {
    headers: createAdminHeaders(admin)
  });
}
