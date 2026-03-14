# @bluesnake-studios/addon-minting

Pure minting and transfer-oriented logic for Meta-Pet add-ons.

## Owns

- `mintAddon()`
- `batchMintAddons()`
- `mintTimeLimitedAddon()`
- replay protection helpers
- expiry checks
- edition limit checks
- transfer draft models

## Notes

- Signing is injected via callbacks so logic stays testable without UI.
- This package does not manage issuer custody or database state.
- Transfer models are starter contracts, not a full trust protocol.
