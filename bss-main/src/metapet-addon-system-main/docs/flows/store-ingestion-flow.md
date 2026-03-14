# Store Ingestion Flow

1. Client receives an add-on from minting, transfer, or a MOSS60 payload.
2. App-level verifier reconstructs the signed payload from `addon-core`.
3. `addon-crypto` verifies the signature against the embedded issuer public key.
4. `addon-store` only mutates state when verification returns true.
5. Snapshot persists through the configured persistence adapter.

## Notes

- The current default adapter is localStorage.
- Store package stays crypto-free by accepting a verifier callback.
- Future production ingestion should add audit events and server reconciliation.
