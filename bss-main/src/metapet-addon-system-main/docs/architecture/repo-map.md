# Repo Map

## Root

- `apps/web` contains the public site, admin route shells, and API entry points.
- `packages/*` contains the reusable building blocks the web app composes.
- `docs/*` explains architecture, flows, and risk posture.
- `tests/*` exercises package seams directly, outside the UI.

## Package Ownership

- `packages/addon-core` owns shared types, schemas, edition policy, and the template registry.
- `packages/addon-crypto` owns canonical serialization, nonce generation, key import and export, and P-256 helpers.
- `packages/addon-minting` owns mint inputs, replay protection helpers, expiry checks, edition checks, and transfer drafts.
- `packages/addon-store` owns the Zustand inventory store, selectors, and persistence adapters.
- `packages/moss60` owns verifiable share payload metadata, hashing, encoding, and share URL generation.
- `packages/ui` owns presentational primitives only.
- `packages/config` owns TS config, ESLint config, env parsing, constants, and feature flags.

## Web App Breakdown

- `apps/web/src/app/(public)` is the public storefront and inventory shell.
- `apps/web/src/app/(admin)` is the admin-facing control plane scaffold.
- `apps/web/src/app/api` is the server composition layer over shared packages.
- `apps/web/src/lib/server` holds route-safe service wrappers.
- `apps/web/src/lib/client` holds store and verification wiring.
- `apps/web/src/components/*` maps package data into page UI.

## Deliberate Gaps

- Issuer custody is not implemented in-repo.
- Production persistence is still a placeholder adapter.
- Admin auth and audit logging are not scaffolded beyond route structure.
