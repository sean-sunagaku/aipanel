# Storage And Debugging

## When To Read This

Read this file when the user wants to inspect saved state, understand artifacts, or troubleshoot why tool usage behaved a certain way.

## Storage Layout

Default root:

```text
.aipanel/
  sessions/
  runs/
  artifacts/
```

Override root:

```bash
AIPANEL_STORAGE_ROOT=/tmp/aipanel-check node dist/bin/aipanel.js consult "Reply with exactly: ready" --json
```

## What Lives Where

- `sessions/<sessionId>.json`
  - `Session`
  - `SessionTurn[]`
  - `ProviderRef[]`

- `runs/<runId>.json`
  - `Run`
  - `RunTask[]`
  - `TaskResult[]`
  - `ContextBundle[]`
  - `ProviderResponse[]`
  - `NormalizedResponse[]`
  - `ComparisonReport[]`

- `artifacts/<runId>/`
  - context bundle snapshots
  - provider raw text/json
  - debug task outputs
  - artifact metadata sidecars

## Fast Inspection Commands

List saved sessions:

```bash
find .aipanel/sessions -maxdepth 1 -type f | sort
```

Inspect one session:

```bash
cat .aipanel/sessions/<sessionId>.json
```

Inspect one run:

```bash
cat .aipanel/runs/<runId>.json
```

List artifacts for a run:

```bash
find .aipanel/artifacts/<runId> -maxdepth 1 -type f | sort
```

## Test Matrix

Use the smallest useful scope:

- `npm run typecheck`: compile-time safety for the repo
- `npm run test:unit`: domain helpers and collectors
- `npm run test:integration`: built CLI + fake Claude + persistence assertions
- `npm run test:e2e`: full CLI flow with persistent storage assertions
- `npm test`: all automated tests

## Troubleshooting Hints

- `providers` works but `consult` fails:
  - verify `claude` is installed and authenticated
  - retry with `--timeout 30000`

- file or log not found:
  - check whether `--cwd` points at the intended repo
  - remember `--file`, `--diff`, and `--log` are resolved relative to `--cwd`

- `followup` looks stateless:
  - inspect `sessions/<sessionId>.json`
  - confirm the expected `SessionTurn` entries were saved

- `debug` is slower than expected:
  - it runs multiple role-based tasks under one `Run`
  - use `consult` for cheaper single-answer checks
