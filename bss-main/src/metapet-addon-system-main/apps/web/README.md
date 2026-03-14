# @bluesnake-studios/web

Thin Next.js App Router shell over the shared Meta-Pet packages.

## Owns

- public and admin route shells
- API routes that compose shared package functions
- client provider wiring for the addon store
- presentation adapters and page-level composition

## Notes

- No crypto logic lives in React components.
- Minting remains server-gated and intentionally incomplete without issuer keys.
- Inventory is local-first until the future DB adapter is implemented.
