# Dependency Graph

```text
@bluesnake-studios/config
@bluesnake-studios/addon-core
@bluesnake-studios/addon-crypto -> @bluesnake-studios/addon-core
@bluesnake-studios/addon-minting -> @bluesnake-studios/addon-core, @bluesnake-studios/addon-crypto
@bluesnake-studios/addon-store -> @bluesnake-studios/addon-core, zustand
@bluesnake-studios/moss60 -> @bluesnake-studios/addon-core, @bluesnake-studios/addon-crypto
@bluesnake-studios/ui -> react
@bluesnake-studios/web -> all shared packages, next, react, react-dom, zustand, zod
```

## Why This Shape

- Core types stay reusable everywhere.
- Crypto remains reusable without dragging in UI or Zustand.
- Minting stays testable as pure package logic.
- Store verification is injected to avoid crypto-store coupling.
- Web remains the integration shell instead of the system of record.
