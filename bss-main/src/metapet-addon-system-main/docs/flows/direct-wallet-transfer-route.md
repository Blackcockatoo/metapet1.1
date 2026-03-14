# Direct Wallet Transfer Route Design

## Decision

- Keep the current admin-authorized transfer route as-is.
- Add a separate direct wallet transfer flow instead of overloading the admin endpoint.
- Require authenticated wallet sessions, durable replay protection, and receiver-consent policy before enabling general availability.

## Why A Separate Route

- The current `POST /api/transfer` flow assumes admin authority is the top-level trust boundary.
- A wallet-native route needs different auth, rate limits, abuse controls, and audit semantics.
- Keeping the routes separate avoids accidental privilege mixing between admin operations and end-user wallet operations.

## Proposed API Shape

### `POST /api/wallet-transfer/prepare`

- Auth: wallet session for the source owner.
- Input: `{ addonId, toOwnerPublicKey }` plus optional receiver-consent preferences.
- Output: canonical unsigned transfer payload with `nonce`, `timestampMs`, `ttlMs`, `requestId`, and any receiver-consent challenge metadata.

### `POST /api/wallet-transfer/submit`

- Auth: wallet session for the source owner.
- Input: signed transfer payload produced from the prepare response.
- Server verifies:
  - session owner matches `fromOwnerPublicKey`
  - signature is valid
  - nonce is unused and unexpired
  - current owner still owns the add-on
  - destination owner is allowed by policy
  - receiver-consent requirement is satisfied when enabled

### Optional `POST /api/wallet-transfer/receiver-consent`

- Needed only if product requires explicit destination acceptance before transfer completion.
- Lets the destination wallet sign a short-lived acceptance payload bound to the transfer `requestId`.

## Authentication Model

- Use wallet-based sign-in with a server-issued challenge.
- Bind the session to the verified wallet public key.
- Require recent re-authentication for sensitive transfer submission if the session is old.
- Apply per-wallet and per-IP rate limits.

## Request Lifecycle

1. Source wallet authenticates.
2. Client calls `prepare`.
3. Server generates transfer payload, replay nonce, TTL, and request ID.
4. Source wallet signs the canonical transfer payload locally.
5. If receiver consent is required, destination wallet signs the consent payload.
6. Client calls `submit` with signatures.
7. Server verifies payload, enforces replay protection, updates ownership transactionally, and writes audit records.

## Policy Checks

- Source wallet session must match `fromOwnerPublicKey`.
- Source and destination owners must differ.
- Add-on must exist and currently belong to the source owner.
- TTL should be short, such as 5 minutes.
- Replays must be rejected across all nodes using the central nonce store.
- Server-side blocklists or sanctions checks can be added later without changing the route contract.

## Receiver Consent Model

Recommended default:

- Keep `TRANSFER_REQUIRE_RECEIVER_CONSENT=false` for the first internal rollout.
- Support optional receiver consent in the contract now.
- Turn mandatory consent on only when the product is ready for destination-wallet UX and support workflows.

Consent payload should include:

- `requestId`
- `addonId`
- `toOwnerPublicKey`
- `issuedAt`
- `expiresAt`

## Persistence Requirements

- Store the prepared request in durable state or make the submit path fully self-contained with signed payload data and nonce uniqueness.
- Record transfer attempts in `audit_events`.
- Record successful ownership changes in `inventory_events`.
- Preserve rejected replay and invalid-signature attempts for abuse analysis.

## Client UX Requirements

- Show the exact destination wallet before signing.
- Show the add-on identity and any irreversible transfer warning.
- Surface TTL expiry clearly so users know when a prepared request must be re-created.
- Make receiver consent status visible if that policy is enabled.

## Error Model

Suggested codes in addition to current admin transfer errors:

- `WALLET_SESSION_REQUIRED`
- `WALLET_SESSION_MISMATCH`
- `TRANSFER_PREPARE_EXPIRED`
- `TRANSFER_RECEIVER_CONSENT_MISSING`
- `TRANSFER_RATE_LIMITED`

## Rollout Plan

1. Keep feature-flagged behind a disabled-by-default env flag.
2. Ship wallet auth and session binding first.
3. Reuse the existing signed transfer verification path where possible.
4. Add wallet-specific audit fields and rate limits.
5. Launch to internal accounts only.
6. Enable receiver consent later if support and UX are ready.

## Explicit Non-Goals

- Replacing admin transfers.
- Peer-to-peer escrow or marketplace settlement.
- Cross-chain or cross-game ownership bridging.

This route should be treated as a separate product surface with its own authentication and abuse controls, not just a public version of the admin endpoint.
