# aipanel CLI Batch Review 2026-03-11 Task Index

## Status Summary
- `done`: 5
- `doing`: 0
- `todo`: 0
- `blocked`: 0

## Execution Order
1. `TASK-CLI-BATCH-01` Replace the current CLI review input contract with repeatable `--provider`
2. `TASK-CLI-BATCH-02` Introduce the shared batch response contract across use cases and rendering
3. `TASK-CLI-BATCH-03` Update tests and payload helpers to the new contract
4. `TASK-CLI-BATCH-04` Refresh docs, skill references, Makefile, and hooks to match the new CLI
5. `TASK-CLI-BATCH-05` Run validation and capture residual risks

## Tracker

| ID | Title | Status | Owner | Depends On | File | Notes |
|---|---|---|---|---|---|---|
| TASK-CLI-BATCH-01 | Replace CLI review input contract | done | main | - | `tasks/aipanel-cli-batch-review-2026-03-11/TASK-CLI-BATCH-01-input-contract.md` | Public review input is repeatable `--provider <provider[:model]>`; abandoned option experiments were discarded |
| TASK-CLI-BATCH-02 | Introduce shared batch response contract | done | main | TASK-CLI-BATCH-01 | `tasks/aipanel-cli-batch-review-2026-03-11/TASK-CLI-BATCH-02-batch-contract.md` | `consult` / `followup` / `debug` now always return batch JSON |
| TASK-CLI-BATCH-03 | Update tests and payload helpers | done | main + worker-tests | TASK-CLI-BATCH-02 | `tasks/aipanel-cli-batch-review-2026-03-11/TASK-CLI-BATCH-03-tests.md` | Unit / integration / E2E now assert provider-only input and batch output |
| TASK-CLI-BATCH-04 | Refresh docs and workflow wrappers | done | main + worker-docs | TASK-CLI-BATCH-01, TASK-CLI-BATCH-02 | `tasks/aipanel-cli-batch-review-2026-03-11/TASK-CLI-BATCH-04-docs-and-workflow.md` | README, skills, Makefile, and hooks now match the public CLI |
| TASK-CLI-BATCH-05 | Validate the full change set | done | main | TASK-CLI-BATCH-02, TASK-CLI-BATCH-03, TASK-CLI-BATCH-04 | `tasks/aipanel-cli-batch-review-2026-03-11/TASK-CLI-BATCH-05-validation.md` | Typecheck, unit, integration, E2E, and skill validation all passed |

## Active Blockers
- None.

## Ready Queue
- None.

## Done Log
- 2026-03-11 15:51 JST: Task set created from the finalized CLI-only plan.
- 2026-03-11 16:05 JST: Decision updated. Public CLI now uses repeatable `--provider <provider[:model]>`, keeps model override inside the provider argument, and keeps always-batch JSON responses as the caller contract.
- 2026-03-11 16:37 JST: Finalized the provider-spec path. `provider:model` now reaches Claude/Codex adapters again without restoring a separate public `--model` flag.
- 2026-03-11 16:05 JST: Parallel execution started with worker-docs handling docs/workflow cleanup and worker-tests handling test/helper migration while main rewrites runtime code.
- 2026-03-11 16:16 JST: Runtime, tests, docs, and workflow wrappers converged on the same public contract. Validation completed with `pnpm exec tsc --noEmit`, `pnpm run test:unit`, `pnpm run test:integration`, `pnpm run test:e2e`, and `pnpm run check:agent-skills`.
- 2026-03-11 16:30 JST: Internal cleanup completed. Public/internal ledger no longer stores model metadata, while `ClaudeCodeAdapter` still passes its provider-owned fixed model to the external `claude` CLI. Revalidated with typecheck plus unit/integration/E2E.
