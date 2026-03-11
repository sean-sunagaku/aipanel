# Plan Command V2 2026-03-11 Task Index

## Status Summary
- `done`: 4
- `doing`: 0
- `todo`: 0
- `blocked`: 0

## Execution Order
1. `TASK-PLAN-01` Extend the shared command, artifact, batch, parser, and renderer contracts for `plan`
2. `TASK-PLAN-02` Implement `PlanUseCase` plus app/router/context wiring for orchestrated plan review
3. `TASK-PLAN-03` Update fake providers and automated tests for `plan` flows and verdict handling
4. `TASK-PLAN-04` Refresh workflow helpers, run validation, and capture residual risks

## Tracker

| ID | Title | Status | Owner | Depends On | File | Notes |
|---|---|---|---|---|---|---|
| TASK-PLAN-01 | Extend shared `plan` contracts | done | main | - | `tasks/plan-command-v2-2026-03-11/TASK-PLAN-01-contracts.md` | Shared command, artifact, batch, parser, and renderer surfaces now accept `plan` plus `--file` |
| TASK-PLAN-02 | Implement orchestrated `plan` runtime | done | main | TASK-PLAN-01 | `tasks/plan-command-v2-2026-03-11/TASK-PLAN-02-runtime.md` | `PlanUseCase`, file-aware context, run ledger recording, and router exit handling are wired |
| TASK-PLAN-03 | Add `plan` test coverage and provider fakes | done | main | TASK-PLAN-01, TASK-PLAN-02 | `tasks/plan-command-v2-2026-03-11/TASK-PLAN-03-tests.md` | Unit, integration, and E2E cover `plan`, file propagation, and `revise` exit behavior |
| TASK-PLAN-04 | Validate and align workflow helpers | done | main | TASK-PLAN-02, TASK-PLAN-03 | `tasks/plan-command-v2-2026-03-11/TASK-PLAN-04-validation.md` | `ai-plan` now routes to `aipanel plan`; typecheck and full test suite passed |

## Active Blockers
- None.

## Ready Queue
- None.

## Done Log
- 2026-03-11 18:40 JST: Task set created from `docs/plans/plan-command-v2.md` and aligned to the repository's existing `tasks/` tracker format.
- 2026-03-11 18:47 JST: Shared `plan` contracts, parser support, renderer output, and file-aware run context landed with clean typecheck.
- 2026-03-11 18:47 JST: `PlanUseCase` now runs `analyzer -> critic -> advisor` sequentially per provider, injects previous outputs into later prompts, records source documents as artifacts, and maps `PLAN_VERDICT: revise` to review-needed results plus CLI exit code `2`.
- 2026-03-11 18:47 JST: Fake providers, JSON payload helpers, integration tests, and E2E coverage now exercise `plan --file`, verdict extraction, text rendering, and codex/claude paths.
- 2026-03-11 18:47 JST: Validation completed with `pnpm exec tsc --noEmit` and `pnpm test`. No active blockers remain.
- 2026-03-11 18:51 JST: Hardening pass completed. `plan` summary now uses the advisor's raw output instead of the `[advice]`-prefixed detail, `--file` is rejected outside `plan`, and new unit/integration tests cover those constraints.
