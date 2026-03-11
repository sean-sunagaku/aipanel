# TASK-PLAN-03: Add `plan` Test Coverage And Provider Fakes

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 18:47 JST

## Goal
- Verify the new `plan` command through parser, support helpers, fake providers, integration paths, and exit-code behavior.

## Parent / Depends On
- Parent: `tasks/plan-command-v2-2026-03-11/index.md`
- Depends On: TASK-PLAN-01, TASK-PLAN-02

## Done When
- Unit tests cover `plan` argument parsing.
- Fake providers reflect `User request:` and `Plan document:` content.
- Integration and E2E tests cover `plan --file`, text output, JSON output, verdicts, and exit code `2`.

## Checklist
- [x] Update parser and payload helper tests
- [x] Extend fake provider fixtures for `plan`
- [x] Add integration coverage for `plan`
- [x] Add E2E coverage for text output and revise exit code

## Progress Log
- 2026-03-11 18:40 JST: Task created. Test work will start once runtime wiring is in place.
- 2026-03-11 18:47 JST: Updated `test/unit/parseArgs.test.ts` and `test/support/cliPayloads.ts` for `plan` parsing plus JSON payload decoding.
- 2026-03-11 18:47 JST: Extended `test/support/fakeClaude.ts` and `test/support/fakeCodex.ts` to detect `User request:` and `Plan document:`, echo plan excerpts for wiring checks, and emit `PLAN_VERDICT: revise` when the prompt includes the `FORCE_PLAN_REVISE` trigger.
- 2026-03-11 18:47 JST: Added integration and E2E coverage for `plan --file`, codex/claude JSON flows, persisted `filePath`, text rendering, and exit code `2` on revise verdicts.
- 2026-03-11 18:51 JST: Added `test/unit/ResultRenderer.test.ts`, expanded `test/unit/ContextCollector.test.ts`, and added an integration test that `consult --file` fails fast with a clear contract error.

## Blockers
- None

## Verification
- 2026-03-11 18:47 JST
  - Type: automated test
  - Scope: parser, payload helper, fake provider, integration, and E2E coverage for `plan`
  - Command: `pnpm test`
  - Result: pass
  - Notes: Unit, integration, and E2E suites all passed after adding `plan` fixtures and assertions.

## Decision Log
- 2026-03-11 18:40 JST: Keep verdict assertions close to integration/E2E so parser unit tests stay narrow and stable.

## Next Action
- Completed.
