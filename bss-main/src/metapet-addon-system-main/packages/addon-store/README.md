# @bluesnake-studios/addon-store

Zustand inventory store for Meta-Pet add-ons.

## Owns

- `initializeAddonStore(publicKey)`
- add, equip, unequip, transfer, receive flows
- selectors
- persistence interface
- localStorage adapter
- future DB adapter placeholder

## Notes

- Crypto verification is injected; the store itself stays crypto-free.
- Add-ons are verified before ingest mutations.
- The default persistence path is local-first and not production database storage.
