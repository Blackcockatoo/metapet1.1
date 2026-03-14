# Risk Assessment

## Issuer Key Custody

- Environment-loaded private keys are acceptable for scaffold wiring only.
- Local or repo-adjacent custody increases exfiltration and misuse risk.
- Production should move to a managed signer, HSM, or equivalent service boundary.

## Transfer Trust

- Current transfer support is a modeling layer, not a complete trust system.
- Without attestation, revocation, and receiver-side policy, transfers can be replayed or spoofed.
- Production needs explicit authority on who can authorize ownership changes.

## Replay Protection

- Local memory guards are insufficient across tabs, devices, or servers.
- Missing durable nonce tracking can allow duplicate mint or transfer attempts.
- Expiry metadata helps but does not replace centralized replay control.
