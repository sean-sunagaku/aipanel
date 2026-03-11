# TASK-CLI-BATCH-01: Replace CLI Review Input Contract

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 16:16 JST

## Goal
- Replace the abandoned CLI option experiment with the finalized CLI review input contract based on repeatable `--provider <provider[:model]>`.
- Make the parser, router, and help text agree on the same provider-only syntax.

## Parent / Depends On
- Parent: `tasks/aipanel-cli-batch-review-2026-03-11/index.md`
- Depends On: none

## Done When
- `parseArgs` only accepts the finalized public review flags.
- Public CLI no longer exposes reviewer model selection.
- Reviewer instances are parsed from repeatable `--provider <provider[:model]>` values.
- Command usage text and routing no longer describe abandoned option experiments.

## Checklist
- [x] Replace the current parser state with provider collection based on repeatable `--provider <provider[:model]>`
- [x] Remove abandoned public reviewer-option parsing and usage text
- [x] Remove the temporary reviewer-spec helper because provider-only parsing is final
- [x] Rewrite the abandoned multi-review WIP so the naming matches the finalized contract
- [x] Ensure router uses the parsed provider list as the only multi-review input source

## Progress Log
- 2026-03-11 15:51 JST: Task created. Existing WIP still referenced abandoned option experiments and incomplete batch plumbing.
- 2026-03-11 16:05 JST: User simplified the contract again. Public CLI should expose provider repetition only, with no reviewer-level model input.
- 2026-03-11 16:18 JST: `parseArgs` and `CommandRouter` now consume repeatable `--provider` values and default reviewer selection without a separate public `--model` flag.
- 2026-03-11 16:37 JST: `parseArgs`, `CommandRouter`, `ConsultUseCase`, and `DebugUseCase` now accept `provider:model` again and pass the optional model override into the selected adapter.

## Blockers
- None

## Verification
- 2026-03-11 16:17 JST: `rg -n 'ConsultationResult|DebugResult|reviewerSpecs|ReviewerSpec|provider\\[:model\\]' src` returned no matches after the runtime rewrite.
- 2026-03-11 16:16 JST: `pnpm exec tsc --noEmit`

## Decision Log
- 2026-03-11 15:51 JST: Public reviewer model selection is not part of the finalized CLI contract.
- 2026-03-11 16:05 JST: CLI review input is standardized on repeatable `--provider`, with any model override embedded as `provider:model`.
- 2026-03-11 15:51 JST: Abandoned CLI option experiments should be treated as intermediate WIP and replaced, not evolved further.

## Next Action
- Completed.
