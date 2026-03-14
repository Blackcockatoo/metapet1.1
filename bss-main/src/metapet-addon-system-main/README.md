# BlueSnake Studios Meta-Pet Add-on System

Production-minded pnpm workspace scaffold for an official Meta-Pet add-on platform.

This repository is intentionally architecture-first. It establishes package boundaries, starter contracts, route surfaces, docs, and test seams without claiming production-complete custody, transfer trust, or signing operations.

## Workspace Map

```text
.
|- apps/
|  `- web/                Next.js App Router shell
|- packages/
|  |- addon-core/         Domain types, schemas, template registry
|  |- addon-crypto/       Web Crypto P-256 helpers
|  |- addon-minting/      Pure minting and transfer models
|  |- addon-store/        Zustand inventory store
|  |- moss60/             Verifiable share payload helpers
|  |- ui/                 Presentational React components
|  `- config/             Shared TS, ESLint, env, flags, constants
|- docs/                  Architecture, flows, security notes
|- tests/                 Unit and integration skeletons
`- .github/workflows/     CI placeholders
```

## Principles

- Keep domain, crypto, minting, store, and UI separate.
- Keep the web app thin over shared packages.
- Verify add-ons before store mutation.
- Do not hardcode private keys or claim security is production-complete.
- Leave TODO markers where issuer custody, server-side signing, or persistence need real infrastructure.

## Quick Start

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
```

## Docs To Read First

- `docs/architecture/repo-map.md`
- `docs/architecture/production-persistence.md`
- `docs/architecture/dependency-rules.md`
- `docs/flows/mint-flow.md`
- `docs/flows/direct-wallet-transfer-route.md`
- `docs/security/managed-key-custody.md`
- `docs/security/signing-and-verification.md`
- `docs/RISK-ASSESSMENT.md`

## Current Scope

- Workspace and package manifests
- Starter TypeScript contracts and boundaries
- Minimal Next.js route shells and API route scaffolds
- Basic tests proving package seams and round trips
- Explicit TODOs for custody, server signing, and production persistence

## Not Declared Complete

- Issuer private key custody
- Production database persistence
- Trusted transfer attestation model
- Replay storage across distributed nodes
- End-user admin authorization and audit trails
