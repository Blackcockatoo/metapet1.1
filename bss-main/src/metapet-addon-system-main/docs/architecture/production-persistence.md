# Production Persistence Architecture

## Decision

- Use a managed PostgreSQL database as the single production system of record.
- Keep application nodes stateless; do not rely on local files or per-node SQLite state.
- Preserve the current repository/service boundaries, but replace the default SQLite adapter with a Postgres-backed adapter for production.

## Why This Direction

- The current SQLite adapter is good for local development, but it is still a single-node persistence model.
- Replay protection for signed transfers must be coordinated across all app instances.
- Inventory ownership changes, order recording, and audit logs need one shared transactional store.
- Postgres gives transactional guarantees, unique constraints, backup tooling, and managed hosting options without forcing a larger platform jump yet.

## Target Runtime Shape

```text
Next.js app nodes
    |
    |  typed repositories / services
    v
Postgres primary
    |
    |- inventory ownership
    |- listings and storefront orders
    |- replay nonces
    `- audit events
```

- App servers only keep request-local state.
- Background cleanup runs as a scheduled job, not inside request handlers.
- Read replicas are optional later, but all writes and replay checks go to the primary.

## Source-Of-Truth Rules

- `inventory` is the canonical owner-to-addon mapping.
- `storefront_orders` is the canonical purchase record.
- `replay_nonces` is the canonical replay gate for signed mint and transfer requests.
- `audit_events` is append-only and never treated as mutable business state.
- JSON snapshots can still exist for compatibility, but they should not remain the primary write path in production.

## Recommended Schema Shape

### `inventory_items`

- One row per owned add-on instance.
- Key columns: `addon_id`, `owner_public_key`, `template_id`, `edition`, `state_json`, `created_at`, `updated_at`.
- Constraints: primary key on `addon_id`; index on `owner_public_key, updated_at desc`.

### `inventory_events`

- Append-only record of mint, transfer, equip, unequip, and reset operations.
- Key columns: `id`, `addon_id`, `event_type`, `actor_id`, `from_owner_public_key`, `to_owner_public_key`, `details_json`, `created_at`.
- This becomes the audit-friendly history for ownership changes instead of reconstructing history from snapshots.

### `listings`

- One row per storefront listing.
- Keep `listing_json` initially if that is the fastest migration path, but promote searchable fields such as `price`, `currency`, `active`, and `template_id` into dedicated columns.

### `storefront_orders`

- Keep the current concept, but add explicit indexed columns for `owner_public_key`, `listing_id`, `status`, `custody_mode`, and `created_at`.
- Preserve `order_json` for compatibility while the domain model is still evolving.

### `replay_nonces`

- One row per unique nonce scope.
- Key columns: `operation`, `scope_key`, `nonce`, `status`, `attempts`, `first_seen_at`, `last_seen_at`, `expires_at`.
- Constraint: unique index on `(operation, scope_key, nonce)`.
- This table must be written in the same region and primary database used by the write path.

### `audit_events`

- Keep the current structure, but treat it as append-only operational evidence.
- Add indexes on `actor_id`, `action`, `status`, and `logged_at`.

## Mapping From Current Code

- `apps/web/src/lib/server/app-database-adapter.ts` stays the main adapter seam.
- `read()` and `write()` should stop being the dominant production path because whole-database replacement does not scale operationally.
- Repository functions such as `inventory-repository`, `listings-repository`, `replay-repository`, and `audit-log` should move toward targeted methods instead of loading full snapshots.
- SQLite remains valid for local development and tests; Postgres becomes the production adapter selected by env.

## Transaction Boundaries

### Mint purchase

- Begin transaction.
- Persist minted add-on ownership in `inventory_items`.
- Insert `storefront_orders` row.
- Insert `inventory_events` row.
- Insert `audit_events` row.
- Commit.

### Signed transfer

- Verify signature before opening the write transaction.
- Begin transaction.
- Insert replay nonce with `ON CONFLICT DO UPDATE` semantics that mark duplicates as replayed.
- Lock the source `inventory_items` row with `FOR UPDATE`.
- Verify current owner still matches `fromOwnerPublicKey`.
- Update owner to `toOwnerPublicKey`.
- Insert `inventory_events` row.
- Insert `audit_events` row.
- Commit.

### Admin unsigned transfer

- Begin transaction.
- Lock the source inventory row.
- Verify admin policy and current ownership.
- Update owner.
- Insert `inventory_events` row with `event_type=admin_transfer`.
- Insert `audit_events` row.
- Commit.

## Replay Protection Guarantees

- Nonce scope should remain `operation + scope_key + nonce`.
- `scope_key` should be issuer or owner scoped depending on operation type; keep that rule explicit in the service layer.
- Expired requests are still recorded so repeated abuse has evidence.
- Cleanup deletes only records older than the retention window and never relies on app startup.

Recommended retention:

- Accepted/replayed transfer nonces: 30 days.
- Mint request nonces: 30 days.
- Audit events and inventory events: 1 year minimum, longer if compliance needs it.

## Operational Requirements

- Managed backups with point-in-time recovery.
- Automated schema migrations.
- Connection pooling for serverless or bursty workloads.
- Metrics for transaction failures, lock wait time, replay rejections, and slow queries.
- A runbook for restoring the primary database without losing nonce uniqueness guarantees.

## Rollout Plan

1. Add a production-only Postgres adapter behind the existing adapter interface.
2. Introduce repository methods for targeted reads and writes so production does not depend on full snapshot replacement.
3. Add migrations for the normalized tables and indexes.
4. Move replay protection first, because multi-node safety depends on it.
5. Move inventory ownership writes next, then listings and orders.
6. Keep SQLite for local-dev and CI fallback until Postgres-backed tests are added.

## Implementation Checklist

### Phase 1 - Adapter seam

- [x] Add backend selection config for `sqlite` vs `postgres`.
- [x] Add a Postgres adapter seam behind `getAppDatabaseAdapter()`.
- [x] Add a real Postgres driver and connection lifecycle.
- [ ] Add migration tooling and initial schema bootstrap.

### Phase 2 - Replay protection first

- [x] Implement `replay_nonces` reads and atomic upserts in Postgres.
- [x] Add a unique index on `(operation, scope_key, nonce)`.
- [ ] Add integration tests proving replay safety across concurrent requests.

### Phase 3 - Ownership and order writes

- [ ] Replace full snapshot replacement with targeted inventory ownership queries.
- [ ] Add transactional transfer updates with row locking.
- [ ] Add Postgres-backed storefront order persistence.
- [ ] Add append-only inventory event writes.

### Phase 4 - Operations and rollout

- [ ] Add audit-event persistence and query indexes.
- [ ] Add retention cleanup jobs for replay-nonce records.
- [ ] Add backup, restore, and migration runbooks.
- [ ] Switch production config to `APP_DATABASE_BACKEND=postgres`.

## Explicit Non-Goals

- Multi-region active-active writes.
- Event-sourcing the whole platform on day one.
- Replacing the current package boundaries.

This design is intentionally the smallest production-capable step: one shared relational source of truth, durable replay protection, and transactional ownership changes.
