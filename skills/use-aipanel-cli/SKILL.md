---
name: use-aipanel-cli
description: Explain how to install, configure, and run `aipanel-cli` as a CLI broker and orchestrator for Claude Code and Codex. Use when someone asks how to use this repository or package, how to run `providers`, `consult`, `followup`, `debug`, or `plan`, how `.aipanel/profile.yml` and `AIPANEL_STORAGE_ROOT` affect behavior, or how sessions and runs are stored. If they ask about imports, clarify that the current published surface is CLI-first and exported TypeScript APIs are not a supported public contract yet.
---

# Use Aipanel Cli

## Overview

Help people use `aipanel-cli` from the CLI first.
Give copy-pastable examples first, then add the minimum explanation needed to avoid misuse.

## Workflow

1. Identify the user's path:
   - local repository usage
   - installed package / global CLI usage
2. Read [references/cli-usage.md](references/cli-usage.md) for command syntax, setup, runtime behavior, profile defaults, and provider-specific notes.
3. Read [references/imports-and-storage.md](references/imports-and-storage.md) only when the question is specifically about package exports or storage layout.
4. Answer with commands or code snippets that match the user's environment:
   - source execution: `pnpm run dev ...`
   - built CLI: `pnpm start ...` or `node dist/bin/aipanel.js ...`
   - installed package: `aipanel ...`
5. Mention the current phase-1 scope when it matters:
   - supported providers: `claude-code`, `codex`
   - supported commands: `providers`, `consult`, `followup`, `debug`, `plan`
   - `compare` is out of scope for phase 1

## Guidance

- Prefer examples that include the exact command shape the user can run immediately.
- Distinguish clearly between local repo usage and package-installed usage.
- Explain review commands with repeatable `--provider` only. Do not reintroduce or document legacy review flags that are no longer public.
- When answering `followup` questions, mention that `aipanel` reconstructs session context itself instead of treating native provider resume state as the source of truth.
- When answering `plan` questions, mention that the positional question is required, `--file` is optional, and attached plan text is stored in the run ledger and session history for later `followup`.
- When users ask about installation or publishing, use package name `aipanel-cli`.
- If the user asks about TypeScript imports, check the current export map before claiming support. The current public surface is CLI-first.
- Codex provider は起動が遅いため `--timeout` は `300000`（5分）以上を推奨。Makefile のデフォルトは `600000`（10分）。
- When users ask about integrating aipanel into their dev workflow, prefer direct CLI invocations from the repository root. The repo also ships Makefile review helpers and git hooks that now embed diffs or plan text into the prompt instead of using removed attachment flags.

## Reference Map

- Use [references/cli-usage.md](references/cli-usage.md) for setup, command examples, profile defaults, runtime notes, Makefile targets, git hooks, and package install guidance.
- Use [references/imports-and-storage.md](references/imports-and-storage.md) for the current export map and storage layout, especially when clarifying that package imports are not yet a supported public API.
