# @bluesnake-studios/moss60

Helpers for MOSS60 verifiable share payloads.

## Owns

- `createMoss60VerifiablePayload()`
- `encodeMoss60Payload()`
- `decodeMoss60Payload()`
- `createShareUrl()`
- digest and hash helpers
- payload metadata models

## Notes

- Share payloads wrap a signed add-on; they are not a replacement for trust checks.
- URL payloads are transport helpers and should be size-reviewed before production release.
- Expiry metadata is advisory until enforced by the consuming service.
