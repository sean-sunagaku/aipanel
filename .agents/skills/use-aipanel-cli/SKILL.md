---
name: use-aipanel-cli
description: Explain how to install, configure, run, and import `aipanel-cli` as a CLI broker and orchestrator for Claude Code and Codex. Use when someone asks how to use this repository or package, how to run `providers`, `consult`, `followup`, or `debug`, how `.aipanel/profile.yml` and `AIPANEL_STORAGE_ROOT` affect behavior, how sessions and runs are stored, or how to use the exported TypeScript APIs.
---

# Use Aipanel Cli

## Overview

Help people use `aipanel-cli` from either the CLI or TypeScript imports.
Give copy-pastable examples first, then add the minimum explanation needed to avoid misuse.

## Workflow

1. Identify the user's path:
   - local repository usage
   - installed package / global CLI usage
   - TypeScript import usage
2. Read [references/cli-usage.md](references/cli-usage.md) for command syntax, setup, runtime behavior, profile defaults, and provider-specific notes.
3. Read [references/imports-and-storage.md](references/imports-and-storage.md) for exported APIs, subpath imports, domain entities, and persistence layout.
4. Answer with commands or code snippets that match the user's environment:
   - source execution: `pnpm run dev ...`
   - built CLI: `pnpm start ...` or `node dist/bin/aipanel.js ...`
   - installed package: `aipanel ...`
5. Mention the current phase-1 scope when it matters:
   - supported providers: `claude-code`, `codex`
   - supported commands: `providers`, `consult`, `followup`, `debug`
   - `compare` is out of scope for phase 1

## Guidance

- Prefer examples that include the exact command shape the user can run immediately.
- Distinguish clearly between local repo usage and package-installed usage.
- When `--cwd` appears, explain that relative paths for `--file`, `--diff`, and `--log` are also resolved against that directory.
- When answering `followup` questions, mention that `aipanel` reconstructs session context itself instead of treating native provider resume state as the source of truth.
- When users ask about installation or publishing, use package name `aipanel-cli`.
- If the user asks for exact exports or runtime details, cite the relevant reference file before inferring behavior.
- Codex provider は起動が遅いため `--timeout` は `300000`（5分）以上を推奨。Makefile のデフォルトは `600000`（10分）。
- When users ask about integrating aipanel into their dev workflow, point to the Makefile targets (`ai-review`, `ai-review-deep`, `ai-plan`, `ai-followup`) and git hooks (`.githooks/`).
- Plan の添削には `make ai-plan FILE=<path>` を案内する。`PLAN_VERDICT: good|revise` で判定される。

## Reference Map

- Use [references/cli-usage.md](references/cli-usage.md) for setup, command examples, profile defaults, runtime notes, Makefile targets, git hooks, and package install guidance.
- Use [references/imports-and-storage.md](references/imports-and-storage.md) for TypeScript imports, exported surfaces, entity creation, and storage layout.
