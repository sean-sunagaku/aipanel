---
name: unused-symbol-pruning
description: Audit and remove unused methods, fields, functions, classes, exports, barrel files, CLI surfaces, validators, and similar symbols with a sub-agent-first workflow. Use when Codex needs to identify dead code, collapse unused package surfaces, delete unused validator or check scripts, or stage high-confidence cleanup batches in JavaScript or TypeScript repositories without accidentally breaking serializer, repository, or entrypoint contracts.
---

# Unused Symbol Pruning

## Overview

Find and delete genuinely unused symbols without relying on a single fragile grep pass.
Use the bundled inventory script to create a rough candidate list, then use specialized sub-agents to confirm runtime usage, public surface impact, grouped deletions, second-pass export tightening, and verification steps before patching.

## Quick Start

1. Read [references/06_policy-decisions.md](references/06_policy-decisions.md) and decide the deletion policy before any audit starts.
2. Read [references/00_overview.md](references/00_overview.md).
3. Run `node .agents/skills/unused-symbol-pruning/scripts/inventory-unused-symbols.mjs --root . --runtime src,scripts,bin,cli,app --tests test --docs README.md,package.json`.
4. Read [references/01_workflow.md](references/01_workflow.md) and [references/02_subagent-roles.md](references/02_subagent-roles.md).
5. Read [references/05_subagent-prompt-template.md](references/05_subagent-prompt-template.md) plus the specific YAML contract in `references/subagents/` for each role you want to spawn.
6. Let sub-agents produce findings only. Keep code edits in the main agent.
7. Classify every candidate with [references/03_classification-rules.md](references/03_classification-rules.md) before deleting anything.
8. Run the second-pass checks in [references/07_second-pass-patterns.md](references/07_second-pass-patterns.md) after the first cleanup wave.
9. Validate each deletion batch with [references/04_verification-checklist.md](references/04_verification-checklist.md).

## Workflow

1. Lock the policy first: runtime roots, whether tests or README count as usage, whether breaking public APIs is allowed, and whether the target mode is CLI-only or CI-only.
2. Inventory symbols and rough reference counts with the bundled script.
3. Split the work across sub-agents by responsibility, not by file.
4. Merge findings into four buckets: `delete-now`, `delete-as-group`, `keep`, `human-review`.
5. Delete in small batches and keep export, README, CLI, package verification, and test updates in the same patch when they belong to the same surface.
6. Run a second pass for module-local exports, barrel files, package `exports`, and stale verification or doc surfaces after the first deletions land.
7. Re-run typecheck and tests after each meaningful batch.
8. Prefer sequential verification when commands mutate `dist` or other shared build outputs.

## Guardrails

- Do not treat validators, checkers, or support scripts as protected by default. If they are unused in the current workflow, they are valid deletion candidates.
- Do not let sub-agents patch code. Use them to gather evidence and classification only.
- Do not assume `public export` means `keep`. Verify package surface, documentation, and runtime usage separately.
- Do not assume `test-only` or `README-only` references mean runtime usage unless the user explicitly wants that policy.
- Do not delete one side of a serializer or repository contract without checking grouped deletion rules.
- Do not stop after dead methods. Follow through into dead fields, dead union members, stale barrel files, stale package exports, and stale verification helpers if the chosen policy allows it.
- Do not run `build`, `pack`, or E2E-style verification in parallel when they share generated output directories.

## Reference Map

- Use [references/00_overview.md](references/00_overview.md) to decide scope and default policy.
- Use [references/01_workflow.md](references/01_workflow.md) for execution order.
- Use [references/02_subagent-roles.md](references/02_subagent-roles.md) for role boundaries and expected outputs.
- Use [references/03_classification-rules.md](references/03_classification-rules.md) before deleting any candidate.
- Use [references/04_verification-checklist.md](references/04_verification-checklist.md) to choose the right validation depth.
- Use [references/05_subagent-prompt-template.md](references/05_subagent-prompt-template.md) as the reusable prompt starter.
- Use [references/06_policy-decisions.md](references/06_policy-decisions.md) to lock the repo-specific deletion policy up front.
- Use [references/07_second-pass-patterns.md](references/07_second-pass-patterns.md) after the first cleanup wave to catch remaining surface and export slack.
- Use `references/subagents/*.yaml` as per-role handoff contracts.
