# Second-Pass Patterns

Run this pass after the first wave of obvious dead code deletion.

## Why A Second Pass Matters

The first wave usually removes dead methods and helpers, but leaves behind smaller surface slack:

- `export` keywords that are no longer needed
- Barrel files that only existed for package import convenience
- `package.json` surface fields that no longer match the intended product mode
- README examples, install smoke tests, and verification scripts that preserve deleted APIs by accident
- Dead fields, status literals, and tiny helper families that become obviously removable only after their callers disappear

## Recommended Second-Pass Tools

1. Re-run the bundled inventory script
2. Run `npx --yes ts-prune -p tsconfig.json` or the repo-equivalent
3. Spawn `module-export-auditor`
4. Spawn `surface-closure-auditor` if package or CLI surface changed

## High-Value Second-Pass Targets

- `Options`, `Props`, `Input`, `Result`, and `Like` types exported from a module but used only inside that module
- Repository helper getters such as `directory`, `pathFor`, `metadataPathFor`, or similar wrappers that no longer have external callers
- Root `index.ts` and subpath barrels after the repo is narrowed to CLI-only or CI-only use
- `package.json` `main`, `types`, and `exports` entries that point to removed surfaces
- README sections that advertise deleted imports
- Package verification scripts that still test removed import paths
- Dead class fields that are written but never read
- Dead enum or union members that no remaining branch can produce

## Practical Heuristic

If a symbol survived the first pass only because it was exported, documented, or routed through a barrel, it deserves a second-pass review.
