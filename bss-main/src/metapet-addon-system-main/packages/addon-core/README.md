# @bluesnake-studios/addon-core

Domain package for Meta-Pet add-ons.

## Owns

- domain types for add-ons and templates
- category and rarity enums
- schema validation
- edition limit models
- template registry and example MOSS60 templates

## Rules

- Other packages import shared types from here.
- This package has no React, Zustand, or Web Crypto code.
- Keep templates deterministic and safe to consume in tests.
