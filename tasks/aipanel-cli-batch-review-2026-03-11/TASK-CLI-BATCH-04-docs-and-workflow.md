# TASK-CLI-BATCH-04: Refresh Docs And Workflow Wrappers

## Status
- Status: done
- Owner: main + worker-docs
- Last Updated: 2026-03-11 16:16 JST

## Goal
- Make the user-facing docs and workflow wrappers reflect the final CLI contract.
- Remove stale references to abandoned review-option experiments and attachment-style wording.

## Parent / Depends On
- Parent: `tasks/aipanel-cli-batch-review-2026-03-11/index.md`
- Depends On: `TASK-CLI-BATCH-01`, `TASK-CLI-BATCH-02`

## Done When
- README and `use-aipanel-cli` references show repeatable `--provider <provider[:model]>` as the review input form.
- No user-facing docs mention abandoned public review-option experiments or attachment-style flags.
- Makefile and `.githooks` no longer advertise obsolete command shapes.

## Checklist
- [x] Update README usage, examples, and runtime notes
- [x] Update `use-aipanel-cli` skill references and guidance
- [x] Rewrite or remove `ai-review` / `ai-review-deep` / `ai-docs-review` flows that still depend on deleted flags
- [x] Check `.githooks` for removed CLI options
- [x] Document one multi-provider Claude+Codex example and one repeated-Codex example using provider-only flags

## Progress Log
- 2026-03-11 15:51 JST: Task created. README, skill references, Makefile, and hooks still contained stale review-option wording.
- 2026-03-11 16:05 JST: Worker-docs picked up the task. Public examples should now avoid abandoned reviewer-option experiments.
- 2026-03-11 16:16 JST: README, public/private skill references, Makefile, and git hooks now describe repeatable `--provider`. Wrapper recipes inline diff/file contents into prompts instead of relying on old attachment-style wording.
- 2026-03-11 16:37 JST: README and public/private CLI usage references were updated again so command shapes explicitly show `--provider <provider[:model]>`.

## Blockers
- None

## Verification
- 2026-03-11 16:16 JST: Scoped grep scan over README, skills, Makefile, and hooks for stale public review-option wording and profile-model mentions.
- 2026-03-11 16:16 JST: `pnpm run check:agent-skills`
- 2026-03-11 16:16 JST: synced `.agents/skills/` to `~/.claude/skills/` and verified with `diff -rq .agents/skills/ ~/.claude/skills/ 2>/dev/null | grep -v "Only in /Users" || true`

## Decision Log
- 2026-03-11 15:51 JST: Docs should treat `aipanel` as a CLI JSON tool first. External TypeScript import guidance is not expanded in this task set.

## Next Action
- Completed.
