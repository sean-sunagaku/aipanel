# Workflow

## Recommended Order

1. Decide policy with `references/06_policy-decisions.md`.
2. Run the inventory script to get an initial symbol table.
3. Spawn `candidate-extractor` and `public-surface-auditor` in parallel.
4. If the repo may be narrowed to CLI-only or CI-only use, also spawn `surface-closure-auditor` in the first wave.
5. Spawn `runtime-usage-auditor` and `symmetry-auditor` using the inventory plus the first-wave outputs.
6. Merge the intermediate findings into a single candidate list.
7. Spawn `refuter` on the provisional deletion set only.
8. Produce final buckets:
   - `delete-now`
   - `delete-as-group`
   - `keep`
   - `human-review`
9. Spawn `batch-planner` to convert final buckets into patch-sized work items.
10. Patch in small batches and validate after each batch.
11. Run `npx --yes ts-prune -p tsconfig.json` or the repo-equivalent after the first wave.
12. Spawn `module-export-auditor` and, if needed, `surface-closure-auditor` again for the second pass.
13. Apply the second-pass cleanup and run the strongest verification set that matches the touched surface.

## Why This Order Works

- The inventory script is fast but approximate.
- Public surface and runtime usage answer different questions and should not be merged too early.
- Symmetry checks catch grouped deletion needs that grep-based usage counts miss.
- The refuter improves precision by looking only for failure reasons.
- The second pass catches stale `export` keywords, barrel files, `package.json` surfaces, and verification scripts that become unnecessary only after the first deletions land.

## Main-Agent Responsibilities

- Choose roots and docs for the inventory script.
- Lock the deletion policy before asking sub-agents for evidence.
- Review sub-agent findings for contradictions.
- Make the final keep/delete call.
- Apply patches.
- Run verification commands.
- Re-run post-cleanup surface audits instead of assuming the first pass fully collapsed the API.
