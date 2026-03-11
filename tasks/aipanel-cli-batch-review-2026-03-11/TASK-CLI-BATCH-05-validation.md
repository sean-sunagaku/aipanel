# TASK-CLI-BATCH-05: Validate The Full Change Set

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 16:30 JST

## Goal
- Run proportionate validation for the new CLI contract and record the evidence in one place.
- Capture residual risks around multi-provider fan-out, repeated provider specs, and single-result callers migrating to batch JSON.

## Parent / Depends On
- Parent: `tasks/aipanel-cli-batch-review-2026-03-11/index.md`
- Depends On: `TASK-CLI-BATCH-02`, `TASK-CLI-BATCH-03`, `TASK-CLI-BATCH-04`

## Done When
- Typecheck passes with no dangling single-result or abandoned option-experiment references in the active CLI surface.
- Relevant unit, integration, and E2E tests pass.
- Residual risks and any intentionally deferred follow-up work are recorded.

## Checklist
- [x] Run `pnpm exec tsc --noEmit`
- [x] Run the relevant unit tests
- [x] Run the relevant integration tests
- [x] Run the relevant E2E tests
- [x] Review remaining worktree diff for stale docs or abandoned contract fragments

## Progress Log
- 2026-03-11 15:51 JST: Task created. Current worktree still fails typecheck because router references batch methods that do not exist yet.
- 2026-03-11 16:05 JST: Validation scope still includes typecheck, focused tests, and a final scan for stale public review-option wording after worker branches merge.
- 2026-03-11 16:16 JST: Validation passed. Runtime, tests, and public docs all agree on repeatable `--provider` plus always-batch JSON.
- 2026-03-11 16:30 JST: Re-ran validation after removing internal model metadata from the ledger and restoring the provider-owned fixed `claude --model ...` argument inside `ClaudeCodeAdapter`.
- 2026-03-11 16:37 JST: Re-ran validation after restoring `provider:model` parsing and adapter routing without reviving a separate public `--model` flag.

## Blockers
- None

## Verification
- 2026-03-11 16:16 JST: `pnpm exec tsc --noEmit`
- 2026-03-11 16:16 JST: `pnpm run test:unit`
- 2026-03-11 16:16 JST: `pnpm run test:integration`
- 2026-03-11 16:16 JST: `pnpm run test:e2e`
- 2026-03-11 16:16 JST: `pnpm run check:agent-skills`
- 2026-03-11 16:16 JST: synced `.agents/skills/` to `~/.claude/skills/` and verified with `diff -rq .agents/skills/ ~/.claude/skills/ 2>/dev/null | grep -v "Only in /Users" || true`
- 2026-03-11 16:16 JST: Repo-wide scoped grep scan for stale public review-option wording outside archived docs/tasks.
- 2026-03-11 16:30 JST: `pnpm exec tsc --noEmit`
- 2026-03-11 16:30 JST: `pnpm run test:unit`
- 2026-03-11 16:30 JST: `pnpm run test:integration`
- 2026-03-11 16:30 JST: `pnpm run test:e2e`
- 2026-03-11 16:37 JST: `pnpm exec tsc --noEmit`
- 2026-03-11 16:37 JST: `pnpm run test:unit`
- 2026-03-11 16:37 JST: `pnpm run test:integration`
- 2026-03-11 16:37 JST: `pnpm run test:e2e`

## Decision Log
- 2026-03-11 15:51 JST: Validation should explicitly check for contract drift between parser, use cases, renderer, test payload helpers, and docs.

## Next Action
- Completed.
