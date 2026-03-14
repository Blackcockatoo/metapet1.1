# Next-Step Implementation Checklist

## Completed

- [x] Align transfer client contract with server schema — admin-authorized unsigned path now
  accepted alongside the full owner-signed path; both paths documented in `web-api.ts` and
  `transfer-verifier.ts`.
- [x] Constant-time admin token comparison (`timingSafeEqual`) in `admin-auth.ts`.
- [x] Align `ADDON_CUSTODY_PROVIDER` env enum to `"local-dev" | "managed"` — eliminates
  the `"env"` vs `"local-dev"` naming drift between `env.ts` and `custody-signer.ts`.
- [x] Atomic replay-nonce upsert in `SqliteAppDatabaseAdapter` — replay protection no longer
  uses a full read-modify-write cycle for SQLite; each nonce check is a single
  `BEGIN IMMEDIATE` transaction.
- [x] Shared `TransferAddonInput` / `SignedTransferAddonInput` types in `web-api.ts` — client
  and server now share explicit documentation of both transfer contract variants.
- [x] Add `upsertReplayNonce` to the `AppDatabaseAdapter` interface and both implementations;
  `consumeReplayNonce` delegates to the adapter directly.
- [x] Test suite passes with correct mocks for `resolveIssuerSigner`, `upsertReplayNonce`,
  and the full admin/owner-signed transfer paths.
- [x] Add optional receiver-consent verification for transfers — server policy can now
  require receiver consent through `TRANSFER_REQUIRE_RECEIVER_CONSENT`, and both the shared
  types and transfer service validate that any consent matches the destination owner.
- [x] Run lint in CI so style regressions fail the `verify` workflow alongside typecheck,
  tests, and build.

## Still to do

- [x] Add provider-backed managed signer wiring (`http` backend) and enforce managed custody
  in production. Local-dev key loading remains available for non-production workflows.
- [ ] Decide canonical production persistence model — SQLite is wired but the replica and
  retention posture are still interim; multi-node replay protection requires a centralised
  nonce store. Design reference: `docs/architecture/production-persistence.md`.
- [x] Decide transfer-route posture: direct non-admin wallet transfer submission is deferred;
  owner-signed payloads remain supported only on the admin-authorized route. Design
  reference: `docs/flows/direct-wallet-transfer-route.md`.

## Design References

- Managed custody target architecture: `docs/security/managed-key-custody.md`
- Production persistence target architecture: `docs/architecture/production-persistence.md`
- Direct wallet transfer target route: `docs/flows/direct-wallet-transfer-route.md`
