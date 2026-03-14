# @bluesnake-studios/addon-crypto

Web Crypto helpers for Meta-Pet add-on signing.

## Owns

- `generateAddonKeypair()`
- canonical serialization
- base64 and base64url helpers
- P-256 import and export helpers
- signature create and verify helpers
- nonce generation

## Notes

- Uses Web Crypto primitives available in modern browsers and Node runtimes.
- Does not store private keys or perform custody.
- Intended to stay generic enough for server and client verification paths.
