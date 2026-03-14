# @bluesnake-studios/config

Shared configuration package for the Meta-Pet add-on workspace.

## Owns

- base TypeScript compiler settings
- Next.js-flavored TypeScript settings
- shared ESLint config
- env parsing helpers
- constants and feature flags

## Notes

- This package is intentionally light and has no runtime knowledge of React, crypto, or persistence.
- Environment parsing exposes placeholders for signing keys but does not provide secrets.
- Feature flags are conservative and default server signing off.
