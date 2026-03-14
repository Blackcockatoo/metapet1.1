export interface AuditEvent {
  action: "mint" | "transfer";
  actorId: string;
  status: "accepted" | "rejected";
  details: Record<string, unknown>;
}

export interface AuditEventRecord extends AuditEvent {
  id: string;
  loggedAt: string;
}

export interface ReplayNonceRecord {
  id: string;
  operation: string;
  scopeKey: string;
  nonce: string;
  status: "accepted" | "replayed" | "expired";
  attempts: number;
  firstSeenAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface WalletSessionRecord {
  sessionId: string;
  ownerPublicKey: string;
  status: "active" | "revoked";
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
}
