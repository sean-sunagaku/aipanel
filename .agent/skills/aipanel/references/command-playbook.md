# Command Playbook

## When To Read This

Read this file when the user wants to run or understand `providers`, `consult`, `followup`, or `debug`.

## Command Surface

```bash
node dist/bin/aipanel.js providers [--json]
node dist/bin/aipanel.js consult "<question>" [--cwd <dir>] [--file <path>] [--diff <path>] [--log <path>] [--timeout <ms>] [--json]
node dist/bin/aipanel.js followup --session <sessionId> "<question>" [--cwd <dir>] [--timeout <ms>] [--json]
node dist/bin/aipanel.js debug "<question>" [--cwd <dir>] [--file <path>] [--diff <path>] [--log <path>] [--timeout <ms>] [--json]
npm start -- <same-args>
npm run dev -- <same-args>
make run ARGS='<same-args>'
```

## How To Choose

- `providers`: verify available providers and basic CLI wiring
- `consult`: one-shot design/review/debugging question
- `followup`: continue from an existing `Session`
- `debug`: orchestrated investigation with multiple roles under one `Run`

## Important Flags

- `--json`: machine-readable output for scripts, tests, or follow-up parsing
- `--cwd`: sets the provider working directory and resolves relative `--file`, `--diff`, `--log`
- `--timeout`: recommended for real provider smoke; start with `30000`, raise to `60000` for slower `debug`

## Typical Flows

### Direct Question

```bash
node dist/bin/aipanel.js consult "この設計どう？" --json
npm run dev -- consult "この設計どう？" --json
```

### Question With Repo Context

```bash
node dist/bin/aipanel.js consult "このログから原因わかる？" \
  --cwd ./target-repo \
  --file src/server.ts \
  --log logs/app.log \
  --json
```

### Continue An Existing Session

```bash
node dist/bin/aipanel.js followup --session session_xxx "この方針で続けてよい？" --json
make run ARGS='followup --session session_xxx "この方針で続けてよい？" --json'
```

### Orchestrated Debug

```bash
node dist/bin/aipanel.js debug "この不具合の根本原因は？" \
  --cwd ./target-repo \
  --file src/cache.ts \
  --log logs/error.log \
  --json \
  --timeout 60000
```

同じ内容を `Makefile` から実行する例:

```bash
make run ARGS='debug "この不具合の根本原因は？" --cwd ./target-repo --file src/cache.ts --log logs/error.log --json --timeout 60000'
```

## What To Explain To Users

- `consult` and `followup` are direct mode
- `debug` is orchestrated mode and records multiple role-based task outputs
- `followup` continuity comes from saved `SessionTurn` history in `aipanel`
- `--cwd` changes both provider execution context and relative file path resolution
