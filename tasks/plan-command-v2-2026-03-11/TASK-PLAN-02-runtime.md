# TASK-PLAN-02: Implement Orchestrated `plan` Runtime

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 18:47 JST

## Goal
- Implement the `plan` orchestrated workflow that carries forward previous step outputs, records file context, and maps verdicts into review and exit behavior.

## Parent / Depends On
- Parent: `tasks/plan-command-v2-2026-03-11/index.md`
- Depends On: TASK-PLAN-01

## Done When
- `PlanUseCase` exists and runs `analyzer -> critic -> advisor` sequentially per provider.
- File content and file path are recorded in run context and artifacts when `--file` is used.
- `AipanelApp` and `CommandRouter` can execute `plan`.
- `plan` returns exit code `2` when any provider verdict is `revise`.

## Checklist
- [x] Add optional `filePath` to collected run context
- [x] Implement `PlanUseCase`
- [x] Wire `PlanUseCase` into the app container
- [x] Add `plan` routing, file loading, and exit handling

## Progress Log
- 2026-03-11 18:40 JST: Task created. Waiting for shared contract updates to land first.
- 2026-03-11 18:47 JST: Added `src/usecases/PlanUseCase.ts` with sequential `analyzer -> critic -> advisor` execution per provider, just-in-time prompt building, previous-output injection, `PLAN_VERDICT` extraction, advisor-based summary selection, and plan-specific artifacts.
- 2026-03-11 18:47 JST: Updated `src/context/ContextCollector.ts`, `src/domain/run.ts`, `src/app/AipanelApp.ts`, and `src/app/CommandRouter.ts` so `--file` content is loaded once, `filePath` reaches the run ledger, and `revise` results surface as exit code `2`.
- 2026-03-11 18:51 JST: Tightened runtime behavior so `plan` summaries use the advisor's raw text and `CommandRouter` rejects `--file` on non-`plan` commands instead of silently ignoring it.

## Blockers
- None

## Verification
- 2026-03-11 18:47 JST
  - Type: automated test
  - Scope: runtime wiring for `PlanUseCase`, run context recording, and router exhaustiveness
  - Command: `pnpm exec tsc --noEmit`
  - Result: pass
  - Notes: `plan` runtime compiles with the new app wiring and no unresolved type gaps.
- 2026-03-11 18:47 JST
  - Type: automated test
  - Scope: orchestrated `plan` runtime through CLI integration and E2E paths
  - Command: `pnpm test`
  - Result: pass
  - Notes: Integration and E2E now confirm `plan --file`, task roles, file-path recording, and `revise` exit code behavior.

## Decision Log
- 2026-03-11 18:40 JST: Reuse the `DebugUseCase` orchestration shape where possible, but switch prompt construction to just-in-time so previous outputs can flow forward.
- 2026-03-11 18:47 JST: Store the source document as a dedicated `plan-source-document` artifact while keeping the run-context artifact as the main reference from `runContexts`.
- 2026-03-11 18:51 JST: Treat `--file` on non-`plan` commands as an input error so the CLI contract stays explicit and callers do not think the file was consumed when it was not.

## Next Action
- Completed.
