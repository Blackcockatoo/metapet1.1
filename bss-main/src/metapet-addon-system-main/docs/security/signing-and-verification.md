# Signing And Verification

## Current Scaffold

- P-256 ECDSA signing helpers live in `packages/addon-crypto`.
- Signed payload shape originates in `packages/addon-core`.
- Verification happens in services and client adapters, not React components.
- Store mutations verify new add-ons before acceptance.

## What Is Not Complete

- No HSM or managed signing service.
- No key rotation or key version revocation workflow.
- No issuer identity registry beyond embedded public keys.
- No production monitoring for failed verification attempts.

## Recommended Production Direction

- move signing into an authenticated server-side service boundary
- version issuer keys and include revocation metadata
- add audit logging for mint and transfer verification events
- separate issuer identity from raw public key transport where possible

See `docs/security/managed-key-custody.md` for the concrete production target.

## Signer Ops Runbook

### Local Mode (`ADDON_CUSTODY_PROVIDER=local-dev`)

Required environment variables:

- `ADDON_CUSTODY_PROVIDER=local-dev`
- `ADDON_ISSUER_PUBLIC_KEY=<base64 spki public key>`
- `ADDON_ISSUER_PRIVATE_KEY=<base64 pkcs8 private key>`

> Local mode is for development and test workflows only.

### Managed Mode (`ADDON_CUSTODY_PROVIDER=managed`)

Managed mode is the required production posture. The server never loads a managed
private key directly; it delegates signing to a provider endpoint.

Required environment variables:

- `ADDON_CUSTODY_PROVIDER=managed`
- `ADDON_MANAGED_SIGNER_BACKEND=http`
- `ADDON_MANAGED_SIGNER_ENDPOINT=<https signer endpoint>`
- `ADDON_MANAGED_SIGNER_KEY_ID=<managed key identifier>`
- `ADDON_MANAGED_ISSUER_PUBLIC_KEY=<base64 spki public key>`
- `ADDON_MANAGED_SIGNER_AUTH_MECHANISM=<bearer-token|none>`
- `ADDON_MANAGED_SIGNER_AUTH_TOKEN=<token>` (required when auth mechanism is `bearer-token`)

Expected request/response contract for the `http` backend:

- request body: `{ keyId: string, payload: SignedAddonPayload }`
- response body: `{ signature: string }`

### Production policy guard

When `NODE_ENV=production`, signer initialization rejects `ADDON_CUSTODY_PROVIDER=local-dev`
with `SIGNER_POLICY_VIOLATION`.

### Verify Signer Health

Use the mint API as a signer health probe (with an admin token) and inspect HTTP status/body:

- `200`: signer initialized and mint flow succeeded.
- `501` + `SIGNER_MISCONFIGURED_KEY`: required signer env vars are missing.
- `501` + `SIGNER_MALFORMED_KEY`: local-dev private key is not a valid base64 PKCS8 P-256 key.
- `501` + `SIGNER_BACKEND_UNAVAILABLE`: configured managed backend is unknown or unavailable.
- `501` + `SIGNER_POLICY_VIOLATION`: production is not configured for managed custody.

## Key Rotation Expectations

- Rotation should happen in the external signing service by key ID (`ADDON_MANAGED_SIGNER_KEY_ID`).
- During rotation windows, deploy application config changes in lockstep with managed signer key activation.
- Treat `ADDON_MANAGED_ISSUER_PUBLIC_KEY` as versioned metadata; update verifiers when key ID changes.
- Preserve audit traces that map minted signatures to the key ID used for signing.
