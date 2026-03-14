# Mint Flow

1. Admin or service selects a template from `addon-core`.
2. Request payload is validated in `apps/web/src/lib/server/mint-service.ts`.
3. `addon-minting` checks edition policy, expiry, and replay inputs.
4. Signing callback canonicalizes the payload through `addon-crypto`.
5. A signed `Addon` artifact is returned to the caller.
6. Client or downstream service verifies before ingestion into `addon-store`.

## Notes

- Issuer private key loading is optional and environment-driven.
- The route returns `501` until issuer signing material is configured.
- Production policy still needs admin auth, auditing, rate limiting, and key custody.
