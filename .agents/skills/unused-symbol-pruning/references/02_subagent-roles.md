# Sub-Agent Roles

## candidate-extractor

- Purpose: Build the initial candidate table from definitions and rough references.
- Best input: inventory script output plus target roots.
- Must return: one row per symbol with location, kind, export state, and raw counts.

## public-surface-auditor

- Purpose: Classify whether a symbol is internal, publicly exported, or documented as part of the package surface.
- Best input: `package.json`, barrel exports, README examples, CLI entrypoints.
- Must return: `internal-only`, `public-undocumented`, or `public-documented`.

## runtime-usage-auditor

- Purpose: Decide whether a symbol is actually used in runtime roots.
- Best input: runtime folders such as `src`, `scripts`, `bin`, `app`, `cli`.
- Must return: `runtime-used` or `runtime-unused`, plus the best evidence.

## symmetry-auditor

- Purpose: Find grouped deletions and contract pairs.
- Best input: serializers, repository helpers, factory methods, framework registrations.
- Must return: groups that must stay together or be deleted together.

## surface-closure-auditor

- Purpose: Identify package surfaces that can be closed or narrowed, especially in CLI-only or CI-only modes.
- Best input: `package.json`, root exports, barrel files, README usage examples, install verification scripts, CLI entrypoints.
- Must return: `surface-to-keep`, `surface-to-close`, and required follow-up files.

## module-export-auditor

- Purpose: Find symbols that are still exported but are only used inside the same module, only used through deleted barrels, or should be inlined after the first deletion wave.
- Best input: `ts-prune` output, recently touched files, runtime roots, and current package surface.
- Must return: `make-local`, `inline-or-delete`, or `keep-exported` with the best evidence.

## refuter

- Purpose: Disprove risky deletions.
- Best input: provisional deletion list only.
- Must return: `safe`, `risky`, or `human-review` with a concrete reason.

## batch-planner

- Purpose: Convert confirmed deletions into patch-sized batches with validation steps.
- Best input: final classified list.
- Must return: batch order, files to touch, and verification commands.
