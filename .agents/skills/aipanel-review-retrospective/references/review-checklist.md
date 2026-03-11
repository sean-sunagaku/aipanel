# Review Checklist

## When The Change Adds Or Changes A CLI Command

- Update the command enum / parser / router / use case / renderer together.
- Add one positive test for text output and one for JSON output.
- Add one negative test for a flag that should not work on sibling commands.
- Re-check exit code behavior when a verdict or status protocol exists.

## When The Change Persists External Input

- Store `filePath` or equivalent source metadata in the run context.
- Save the source input as an artifact when later inspection matters.
- Link the saved artifact back from the run ledger with both ID and path.
- If the command returns a reusable `sessionId`, verify `followup` can still see the original source context.

## When The Change Adds Orchestration

- Assert the task order and task roles explicitly.
- Make fake providers parse the same prompt / transcript sections that the real workflow depends on.
- Verify that downstream steps really receive upstream output, not just the original question.

## When Docs Or Skills Can Drift

- Update README examples and any Makefile helper that wraps the changed command.
- Update repo-private and public Skills that explain the changed surface.
- If `.agents/skills/` changed, run `pnpm run check:agent-skills` and sync to `~/.claude/skills/`.

## Validation Ladder

- Start with the narrowest useful test.
- Widen to integration / e2e when persistence, CLI parsing, or provider orchestration changed.
- Finish with repo-level validation when multiple layers moved together.
