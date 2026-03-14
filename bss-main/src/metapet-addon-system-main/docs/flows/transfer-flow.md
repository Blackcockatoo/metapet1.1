# Transfer Flow

Two transfer paths are supported. Both are on the same admin-authorized endpoint and
require a valid admin session (`x-admin-token` verified by `requireAdminSession`).

## Path A — Admin-authorized unsigned transfer (current UI / admin console)

1. Admin supplies `{ addonId, fromOwnerPublicKey, toOwnerPublicKey }`.
2. `requireAdminSession` validates the request; admin authority is the trust boundary.
3. `transferAddonFromRequest` detects the absence of a `signature` field and routes to
   the admin-unsigned path.
4. `transferOwnedAddon` updates inventory ownership atomically.
5. Sender inventory ejects the transferred add-on; receiver inventory gains it.

This path is intentionally simpler and sufficient for controlled admin environments.
It does **not** prove that the source owner consented to the transfer independently of
admin authority.

## Path B — Admin-authorized owner-signed transfer

1. Source owner constructs `{ addonId, fromOwnerPublicKey, toOwnerPublicKey, nonce, timestampMs, ttlMs }` and signs the canonical payload with their private key.
2. An admin-authorized caller submits the signed request (including `signature`) through the same `POST /api/transfer` route.
3. `verifySignedTransferRequest` verifies the P-256 ECDSA signature.
4. `consumeReplayNonce` records the nonce atomically and rejects replays or expired TTLs.
5. `transferOwnedAddon` updates inventory ownership.

This path is available today only when admin authorization succeeds. It adds
source-owner consent proof and replay protection beyond the unsigned admin path.

Receiver-consent enforcement is controlled by server policy. When
`TRANSFER_REQUIRE_RECEIVER_CONSENT=true`, both transfer paths must include receiver-consent
metadata that matches the destination owner public key.

## Trust properties by path

| Property | Path A (admin) | Path B (owner-signed) |
|---|---|---|
| Admin authorization required | ✓ | ✓ |
| Source owner consent proof | ✗ | ✓ (signature) |
| Replay protection | ✗ | ✓ (nonce + TTL) |

## Notes

- `consumeReplayNonce` uses an atomic `BEGIN IMMEDIATE` SQLite transaction so replay
  protection is consistent under concurrent requests within a single process.
- Multi-node replay protection still requires a centralised nonce store.
- Direct non-admin wallet submission is deferred; transfers remain admin-authorized only until dedicated wallet auth and policy controls are implemented.
- Production deployments should centralise authority policy and revocation controls.

See `docs/flows/direct-wallet-transfer-route.md` for the proposed wallet-native route design.
