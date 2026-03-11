# TASK-PLAN-01: Extend Shared `plan` Contracts

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 18:47 JST

## Goal
- Add `plan` to the shared command, artifact, parser, and renderer contracts without breaking existing exhaustive matches.

## Parent / Depends On
- Parent: `tasks/plan-command-v2-2026-03-11/index.md`
- Depends On: none

## Done When
- `plan` exists in command and batch unions.
- `PlanBatchOutput` and related artifact kinds are available to runtime and renderer code.
- `parseArgs` can capture optional `--file <path>` while preserving existing flags.
- Text and JSON rendering can represent `plan` provider results.

## Checklist
- [x] Update shared command and run-domain literals for `plan`
- [x] Extend artifact and CLI batch contracts for `plan`
- [x] Add `--file` parsing support
- [x] Update text rendering for `plan` outputs and verdicts

## Progress Log
- 2026-03-11 18:40 JST: Task created from the v2 implementation plan before runtime work starts.
- 2026-03-11 18:47 JST: Updated `src/shared/commands.ts`, `src/domain/run.ts`, `src/domain/artifact.ts`, `src/shared/cli-contract.ts`, `src/cli/parseArgs.ts`, and `src/output/ResultRenderer.ts` so `plan` participates in the shared literals, batch unions, parser state, and rendered output.

## Blockers
- None

## Verification
- 2026-03-11 18:47 JST
  - Type: automated test
  - Scope: shared `plan` command, batch contract, parser, and renderer typing
  - Command: `pnpm exec tsc --noEmit`
  - Result: pass
  - Notes: Exhaustive `match()` branches and new `PlanBatchOutput` plumbing compile cleanly.

## Decision Log
- 2026-03-11 18:40 JST: Keep the first task focused on type and contract surfaces so later `ts-pattern` branches can be updated in a single coherent pass.

## Next Action
- Completed.
