# Dependency Rules

## Allowed Internal Dependency Flow

```text
config      addon-core
   |           |
   |     addon-crypto
   |       /      \
   | addon-minting moss60
   |        |
   |   addon-store
   |      /   \
   `---- ui   apps/web
```

## Rules

- `addon-core` sits at the center of shared domain types and stays free of React, Zustand, and Web Crypto.
- `addon-crypto` may depend on `addon-core` types but must not depend on store or UI code.
- `addon-minting` may depend on `addon-core` and `addon-crypto` only.
- `addon-store` depends on `addon-core` and Zustand; crypto verification is injected from consumers.
- `moss60` may depend on `addon-core` and `addon-crypto` only.
- `ui` stays presentational and must not import minting, crypto, or store code.
- `apps/web` is the top-level consumer and may depend on all shared packages.

## Forbidden Patterns

- No circular dependencies between packages.
- No React components importing private keys or signing helpers directly.
- No business-critical minting logic in Next page components.
- No store mutations that skip verification on newly ingested add-ons.

## Repository Consistency Rules (apps/web inventory)

- Inventory mutations in `apps/web/src/lib/server/inventory-repository.ts` must run through an atomic read-modify-write helper that holds a per-owner critical section for the full mutation.
- Multi-owner operations (for example transfer) must acquire owner locks in deterministic lexical order to prevent deadlocks when two transfers happen in opposite directions.
- `appendOwnedAddon` and `transferOwnedAddon` should only mutate snapshots through these atomic primitives so concurrent requests do not lose writes.
- Transfer semantics: source owner loses the addon, destination owner receives a copied addon with updated `ownerPublicKey`, and equipped state resets (`equipped: false`, `equippedAt: undefined`). If the moved addon was equipped at source, `equippedByCategory[category]` is cleared.
