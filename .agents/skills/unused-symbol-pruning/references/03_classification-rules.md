# Classification Rules

## Final Labels

- `delete-now`
  - Runtime-unused
  - Or field/accessor-unused with no meaningful reads
  - Or export-only slack that can safely become module-local
  - Not protected by grouped-deletion rules
  - No convincing refutation

- `delete-as-group`
  - Safe only when paired helpers or related exports are removed together
  - Typical examples: `toJSON`/`fromJSON`, repository method families, mirrored CLI/public surfaces, package `exports` plus README examples plus install verification scripts, root barrels plus subpath barrels

- `keep`
  - Runtime-used
  - Or required by convention, framework, or explicit user policy

- `human-review`
  - Conflicting evidence
  - Dynamic usage suspicion
  - Public API ambiguity the repo cannot resolve locally

## Rules To Apply

1. Prefer runtime evidence over test-only or README-only evidence.
2. Do not special-case validators, checkers, or support scripts. If they are unused, they may be deleted.
3. Do not protect a symbol just because it is exported.
4. Do not delete one side of a symmetric contract alone.
5. In CLI-only or CI-only mode, actively look for package import surfaces, barrel files, and verification scripts that only preserve now-deleted module APIs.
6. Prefer making a symbol non-exported before deleting it only when runtime behavior stays identical and the user did not ask for maximal pruning.
7. When in doubt, move the symbol to `human-review`, not `delete-now`.

## High-Confidence Patterns

- A setter, helper, or repository method with zero runtime call sites
- A class field that is only written, serialized nowhere, and never read
- A union member or status literal that no remaining branch can produce
- An `index.ts` barrel whose only purpose was package or subpath import convenience and the repo is now CLI-only
- A package `main`, `types`, or `exports` surface that no longer matches the intended product mode
- An exported `Options`, `Props`, `Input`, or `Result` type used only inside its defining module after cleanup
