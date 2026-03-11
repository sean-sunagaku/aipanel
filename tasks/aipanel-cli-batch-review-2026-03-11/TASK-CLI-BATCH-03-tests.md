# TASK-CLI-BATCH-03: Update Tests And Payload Helpers

## Status
- Status: done
- Owner: main + worker-tests
- Last Updated: 2026-03-11 16:16 JST

## Goal
- Rebuild the CLI test harness around the new always-batch JSON contract.
- Remove the current split between ad hoc payload helper interfaces and the actual runtime renderer output.
- Align tests with the provider-only public CLI surface by removing abandoned reviewer-option expectations.

## Parent / Depends On
- Parent: `tasks/aipanel-cli-batch-review-2026-03-11/index.md`
- Depends On: `TASK-CLI-BATCH-02`

## Done When
- `test/support/cliPayloads.ts` validates the shared batch contract instead of independent single-result payloads.
- Unit tests cover repeatable `--provider` parsing and invalid inputs.
- Integration/E2E tests expect batch JSON for single and multi-provider runs.
- Multi-provider success and partial-failure cases are both covered.

## Checklist
- [x] Update unit tests for repeatable `--provider`
- [x] Rewrite `cliPayloads.ts` around the shared batch contract
- [x] Update integration tests for batch `consult`, batch `debug`, and single-result `followup` wrapped in batch form
- [x] Update E2E tests to verify batch JSON shape for single and multi-provider calls
- [x] Add mixed-provider and repeated-provider batch coverage

## Progress Log
- 2026-03-11 15:51 JST: Task created. Existing tests still assert `consultation` and `debug` single-result payloads.
- 2026-03-11 16:05 JST: Worker-tests picked up the task. The target contract is now provider-only plus always-batch JSON.
- 2026-03-11 16:16 JST: Unit, integration, and E2E suites now assert batch JSON, provider-only input, and multi-provider order. Payload helpers no longer shadow the old single-result contract.

## Blockers
- None

## Verification
- 2026-03-11 16:16 JST: `pnpm run test:unit`
- 2026-03-11 16:16 JST: `pnpm run test:integration`
- 2026-03-11 16:16 JST: `pnpm run test:e2e`

## Decision Log
- 2026-03-11 15:51 JST: Contract validation in tests should come from the same shared type/shape used by runtime code, not parallel handwritten payload interfaces.

## Next Action
- Completed.
