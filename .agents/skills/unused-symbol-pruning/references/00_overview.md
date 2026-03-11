# Unused Symbol Pruning Overview

## Goal

Remove truly unused symbols with evidence, not intuition.
This skill is designed for JS/TS repositories where dead code can live in application code, public exports, CLI surfaces, validators, check scripts, serializers, repositories, and support tooling.

## What To Treat As In Scope

- Class instance methods
- Class fields and accessors
- Static methods
- Exported functions
- Exported classes
- Exported type aliases, interfaces, enums, and constants when they are part of the repo surface
- Public package surfaces
- Barrel files such as `index.ts` and root export files
- Package metadata surfaces such as `main`, `types`, and `exports`
- CLI entrypoints and related helpers
- Validators, checkers, and support scripts
- README usage examples, install verification scripts, and package smoke tests that preserve deleted APIs by accident

## What To Treat As High Risk

- Serializer and deserializer pairs such as `toJSON` and `fromJSON`
- Repository method families such as `save`, `get`, `list`, and `require`
- Package exports and README import examples
- Package install verification scripts and smoke tests
- Entry points under `bin/`, `cli/`, or similar folders
- Framework hooks, plugin registrations, or convention-based files
- Any command that mutates `dist` or other shared build outputs used by tests

## Default Policy

- Count `src/`, `scripts/`, `bin/`, `cli/`, and `app/` style runtime roots as runtime evidence.
- Treat `test/` and README-only references as supporting evidence, not runtime proof, unless the user asks otherwise.
- Do not protect validators just because they are validators.
- Allow public exports to be deleted if evidence says they are unused and the user accepts breaking changes.
- If the user wants CLI-only or CI-only tooling, treat package import surfaces, barrels, and install-verification imports as deletion candidates, not keepers.
