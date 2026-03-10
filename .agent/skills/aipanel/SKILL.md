---
name: aipanel
description: Use this skill when the user wants operational guidance for the aipanel CLI in this repository. Triggers include requests to learn how to run providers, consult, followup, or debug, how to use --model, --cwd, or AIPANEL_STORAGE_ROOT, how to inspect sessions/runs/artifacts, how to verify the tool with tests or E2E checks, or how to troubleshoot tool usage safely. Do not use this skill for implementing aipanel itself.
---

# AIPanel

## Overview

This skill is the operating guide for the `aipanel` CLI in this repository. Use it to understand how to run the tool, what each command does, where state is saved, how to verify behavior with tests or E2E checks, and how to troubleshoot usage issues.

## Workflow

1. Identify the user's goal.
   - First-time setup or runnable verification: read `references/install-and-verify.md`
   - Run or explain `providers`, `consult`, `followup`, or `debug`: read `references/command-playbook.md`
   - Inspect saved state, artifacts, test coverage, or failures: read `references/storage-and-debugging.md`

2. Prefer the built CLI when explaining or verifying behavior.
   - Use `node dist/bin/aipanel.js ...` for smoke checks and E2E-style runs
   - Run `npm run build` before manual verification if the CLI may be stale

3. Isolate verification state unless the user wants shared history.
   - Prefer `AIPANEL_STORAGE_ROOT="$(mktemp -d)"` for smoke tests
   - Use `--cwd <dir>` when file/diff/log paths should resolve relative to another workspace

4. Pick the right verification depth.
   - Quick tool sanity check: `providers`
   - Automated tool verification: `npm test`
   - End-to-end command confirmation: `npm run test:e2e`
   - Real provider smoke: run `providers`, then `consult`, and only then `followup` or `debug`

5. Keep the user informed about verification scope.
   - Distinguish fake-provider tests from real Claude Code smoke runs
   - If real Claude Code was not run, say so clearly

## Operating Rules

- This skill is for operating `aipanel`, not for changing its implementation
- Current phase 1 scope is `claude-code` only
- `compare` is not a public phase 1 command; it remains a phase 2 placeholder
- `followup` uses `aipanel` session history as the source of truth, not Claude native resume as the canonical state
- `debug` is orchestrated mode and is slower than `consult`; use explicit `--timeout` when needed
- `--model` is passed through to `claude-code`; if omitted, `aipanel` falls back to `.aipanel/profile.yml` `defaultModel`, then `sonnet`
- When validating context collection, remember that `--cwd` affects both provider execution and relative path resolution for `--file`, `--diff`, and `--log`

## Quick Prompts

- "Use `$aipanel` to show me how to run `consult` with files and logs."
- "Use `$aipanel` to explain how `followup` works and where session history is saved."
- "Use `$aipanel` to show me how to inspect a run and its artifacts after `debug`."
- "Use `$aipanel` to run the E2E tests and tell me what they prove about the tool."
