# Replay Protection

## Current Scaffold

- Mint and transfer inputs carry nonces.
- `addon-minting` exposes an in-memory replay guard for tests and local flows.
- Expiry helpers reject stale requests when `expiresAt` is set.

## Limitations

- In-memory replay tracking does not survive reloads or distributed workers.
- Nonce reuse is not coordinated across regions or services.
- Share URLs can be copied freely unless a consuming service enforces expiry.

## Production Follow-Up

- back replay state with a durable datastore
- scope nonces by issuer and operation type
- define replay retention windows and cleanup policy
- record rejected replay attempts for audit review

See `docs/architecture/production-persistence.md` for the recommended production datastore shape.
