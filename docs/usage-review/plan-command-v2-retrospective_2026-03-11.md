# Plan Command V2 Retrospective Notes

## Context

This note captures lessons from implementing and hardening `aipanel plan`, especially around `--file`, orchestrated review flow, run/session persistence, and followup continuity.

## Confirmed Good Changes

- The final shape of `plan` is easy to reason about: `analyzer -> critic -> advisor`, with a clear `PLAN_VERDICT: good|revise` protocol.
- The feature was validated across unit, integration, and E2E layers instead of relying on one broad happy-path check.
- `plan` now stores both run context and the source document artifact, which makes the workflow observable after execution instead of hiding critical input only inside prompts.

## What We Should Have Caught Earlier

### 1. Session continuity matters more than artifact persistence alone

Saving the plan file as an artifact was not enough, because `followup` rebuilds context from session transcript. If a command returns a reusable `sessionId`, the original source input also needs to survive in session history or be re-hydrated automatically.

Default next time:

- add a `followup` test from the first implementation pass for any new session-producing command
- explicitly ask, "what will the next `followup` actually see?"

### 2. Artifact observability should be queryable from the run ledger

We initially wrote the source document artifact but did not link it back from `runContext`. That made post-hoc debugging weaker because the stored run could not point to the exact source input that was reviewed.

Default next time:

- whenever a command writes a source artifact, store both the artifact ID and path on the run context
- verify that the persisted run JSON can reconstruct the evidence trail without reading the code

### 3. Command-specific flags need negative contract tests

`--file` is useful for `plan`, but sibling commands could silently accept or ignore it unless that contract is tested and enforced. This kind of CLI drift is easy to miss during implementation and confusing in real usage.

Default next time:

- add at least one "wrong command, wrong flag" test for any new option
- review parser behavior and help text together, not separately

### 4. Summary and output contracts deserve direct assertions

The advisor output originally leaked through the detail path instead of the final summary surface. The batch contract needs direct tests for `summary`, `details`, `verdict`, and exit code mapping.

Default next time:

- assert the user-facing summary separately from raw detail blocks
- verify both text rendering and JSON payloads for any new output kind

### 5. README, Makefile, and Skill drift should be part of the delivery slice

The runtime worked before the surrounding docs and workflow helpers were aligned. That created temporary drift in README examples, `ai-plan`, and the `use-aipanel-cli` skill even though the implementation itself was already correct.

Default next time:

- treat README, Makefile helpers, hooks, and relevant Skills as part of the same feature slice
- if `.agents/skills/` changed, run `pnpm run check:agent-skills` and sync skills before calling the task done

### 6. Fake providers should exercise transcript-based behavior

The `followup` regression only becomes visible when fake providers inspect the reconstructed conversation closely enough to notice whether the plan document survived. If test doubles only look at the current question, they will miss this class of bug.

Default next time:

- upgrade fake providers when prompt or transcript shape changes
- prefer transcript-aware fixtures over fixtures that only parse the latest question

## Next-Time Checklist

- new command added: update parser, command enum, router, use case, renderer, README, Makefile, and Skills together
- new flag or external input: add positive and negative CLI tests
- new persisted artifact: link it from the run ledger
- new session-producing workflow: run a followup test using that session
- new verdict protocol: test JSON, text, and exit code behavior
- new prompt structure: update fake providers and E2E coverage

## Evidence

- `src/usecases/PlanUseCase.ts`
- `test/integration/cli.test.ts`
- `test/e2e/cli.e2e.test.ts`
- `test/support/fakeClaude.ts`
- `test/support/fakeCodex.ts`
- `README.md`
- `.agents/skills/use-aipanel-cli/`
- `tasks/plan-command-v2-2026-03-11/index.md`
