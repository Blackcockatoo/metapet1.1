# Managed Key Custody Design

## Decision

- Production signing should happen in an external managed signer or HSM-backed service.
- The web app must never load issuer private keys from environment variables in production.
- `apps/web/src/lib/server/custody-signer.ts` remains the integration point, but its production behavior should become a thin client over a hardened signer service.

## Goals

- Prevent raw issuer private key exposure in app processes.
- Support key rotation without breaking verification.
- Attach stable key identity and audit metadata to every mint and transfer signature.
- Fail closed when signer policy, signer auth, or key state is invalid.

## Trust Boundary

```text
web app -> authenticated signer client -> managed signer API -> HSM / KMS key material
```

- The web app is allowed to request signatures for approved payload types.
- The signer service is responsible for key access, policy enforcement, audit emission, and key status.
- Key material stays inside HSM or managed KMS boundaries.

## Recommended Signer Contract

### `POST /sign-addon-payload`

Request body:

```json
{
  "keyId": "issuer-key-v3",
  "requestId": "uuid",
  "purpose": "mint-addon",
  "payload": {},
  "payloadHash": "base64url-sha256"
}
```

Response body:

```json
{
  "signature": "base64url-signature",
  "keyId": "issuer-key-v3",
  "publicKey": "base64-spki",
  "algorithm": "ECDSA_P256_SHA256"
}
```

### `GET /health`

- Returns signer availability and currently active key metadata.
- Should not expose secrets or raw key handles.

## Authentication And Transport

- Prefer workload identity, mTLS, or signed service-to-service credentials.
- Treat static bearer tokens as a temporary bootstrap mode only.
- Restrict egress so the app can call only the approved signer endpoint.
- Enforce short timeouts and bounded retries in the signer client.

## Key Model

Each issuer key version should have:

- `key_id`
- `issuer_id`
- `public_key`
- `status` (`active`, `verify-only`, `revoked`, `retired`)
- `activated_at`
- `retired_at`
- `rotation_reason`

Recommended rules:

- Only one `active` signing key per issuer at a time.
- `verify-only` keys remain accepted by verifiers during rotation windows.
- `revoked` keys fail verification for new operations and trigger operational review.

## Application Changes

### `custody-signer.ts`

- Keep `local-dev` mode for development only.
- Expand managed responses to carry `keyId` and `publicKey`, not just `signature`.
- Convert remote failures into typed errors such as `SIGNER_TIMEOUT`, `SIGNER_UNAUTHORIZED`, and `SIGNER_BAD_RESPONSE`.
- Add explicit timeout, retry, and correlation-id handling.

### Mint and purchase flows

- Persist the `keyId` used for mint signing with each minted record or order event.
- Include signer request IDs in audit details.
- Surface signer mode and key metadata to admin diagnostics, but never secrets.

### Verification

- Verification should resolve trust by issuer and key version, not only by a single embedded public key.
- Maintain an issuer public key registry that supports multiple concurrent verify-only keys.

## Environment Model

Keep existing env vars, but move toward this production set:

- `ADDON_CUSTODY_PROVIDER=managed`
- `ADDON_MANAGED_SIGNER_BACKEND=http`
- `ADDON_MANAGED_SIGNER_ENDPOINT=<https endpoint>`
- `ADDON_MANAGED_SIGNER_KEY_ID=<active issuer key id>`
- `ADDON_MANAGED_SIGNER_AUTH_MECHANISM=<workload-identity|mtls|bearer-token>`
- `ADDON_MANAGED_SIGNER_TIMEOUT_MS=3000`
- `ADDON_MANAGED_SIGNER_RETRY_COUNT=1`

Avoid storing long-lived bearer tokens in the same runtime if workload identity is available.

## Audit And Monitoring

Every sign request should emit:

- `request_id`
- `key_id`
- `purpose`
- caller service identity
- result (`success`, `denied`, `timeout`, `bad_request`)
- timestamp and latency

Alert on:

- signer unavailability
- unexpected key ID changes
- spikes in denied sign attempts
- verification failures tied to a new key version

## Rotation Runbook

1. Provision new key version in the managed signer.
2. Publish the new public key as `verify-only` in the verifier registry.
3. Update app config so new mint requests ask for the new `keyId`.
4. Observe successful signing and verification.
5. Change previous key to `verify-only` for the rollback window.
6. Retire or revoke the old key when the rollback window closes.

## Failure Policy

- If the signer cannot be reached, minting fails; do not silently fall back to local signing.
- If the signer returns a different `keyId` than requested, reject the response.
- If the signer returns a public key that does not match the trusted registry for that `keyId`, reject the response and raise an alert.
- If production starts with `local-dev` custody, fail startup or first signer resolution as it already does today.

## Follow-On Implementation Work

1. Extend the signer response contract and typed error model.
2. Add signer timeout and retry configuration.
3. Persist `keyId` in order and audit records.
4. Add issuer key registry support to verification.
5. Add a health-check path and admin diagnostics for signer status.

This keeps local development simple while making production custody a real service boundary instead of an environment variable convention.
