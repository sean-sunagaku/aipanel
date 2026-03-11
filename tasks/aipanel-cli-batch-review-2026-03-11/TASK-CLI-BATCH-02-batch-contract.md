# TASK-CLI-BATCH-02: Introduce Shared Batch Response Contract

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 16:16 JST

## Goal
- Create one shared CLI JSON contract for `consult`, `followup`, and `debug`.
- Make use cases and `ResultRenderer` produce the same always-batch shape so callers never branch on single vs multi-provider responses.

## Parent / Depends On
- Parent: `tasks/aipanel-cli-batch-review-2026-03-11/index.md`
- Depends On: `TASK-CLI-BATCH-01`

## Done When
- A shared batch response type exists in repo code and is used by use cases, renderer, and test payload parsing.
- `consult`, `followup`, and `debug` all return `kind: "batch"` with `command`, `runId`, `status`, and `results[]`.
- `results[]` preserves CLI input order and exposes `provider`, `sessionId?`, `status`, `reviewStatus?`, `errorMessage?`, and command-specific `output`.

## Checklist
- [x] Define the shared batch response types and command-specific output payloads without leaking adapter model selection
- [x] Update `ConsultUseCase` to return batch results, including multi-provider fan-out
- [x] Update `FollowupUseCase` to wrap the single-provider result in batch form
- [x] Update `DebugUseCase` to return batch results in the shared contract
- [x] Update `ResultRenderer` to render only the shared batch contract

## Progress Log
- 2026-03-11 15:51 JST: Task created. Current code still exposes separate `ConsultationResult` and `DebugResult` contracts.
- 2026-03-11 16:05 JST: Batch contract decision tightened again. Public batch results should expose provider identity and session continuity, but not model names.
- 2026-03-11 16:18 JST: `ConsultUseCase`, `FollowupUseCase`, `DebugUseCase`, and `ResultRenderer` were rewritten onto the shared batch contract. Internal adapter/model bookkeeping still exists in run artifacts, but `src/shared/cli-contract.ts` no longer exposes `model` in public batch results.

## Blockers
- None

## Verification
- 2026-03-11 16:16 JST: `pnpm exec tsc --noEmit`
- 2026-03-11 16:16 JST: `pnpm run test:integration`
- 2026-03-11 16:16 JST: `pnpm run test:e2e`

## Decision Log
- 2026-03-11 15:51 JST: Single-result JSON shapes are intentionally retired in favor of one batch contract.
- 2026-03-11 15:51 JST: Public API does not include `instanceIndex`; repeated provider specs are distinguished by result order plus per-result `runId` and `sessionId`.
- 2026-03-11 15:51 JST: The shared contract is repo-internal only for now; no package export work is included in this task set.
- 2026-03-11 16:05 JST: Public batch results should not expose `model`. Adapter/model selection remains an internal concern while the CLI stays provider-only.

## Next Action
- Completed.
