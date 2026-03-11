# CLI Usage

## Scope

`aipanel-cli` is a TypeScript CLI broker and orchestrator for Claude Code and Codex.
Phase 1 currently supports:

- providers: `claude-code`, `codex`
- commands: `providers`, `consult`, `followup`, `debug`
- persistence owned by `aipanel`: `Session`, `Run`, `Artifact`

`compare` is not part of phase 1.

## Setup

Build from the repository:

```bash
npm install
npm run build
```

Quick checks:

```bash
node dist/bin/aipanel.js providers --json
npm start -- providers --json
npm run dev -- providers --json
```

`make install`, `make build`, `make smoke`, and `make dev` are equivalent shortcuts when `Makefile` is available.

## Installed Package Usage

The published package name is `aipanel-cli`.

```bash
npm install -g aipanel-cli
aipanel providers --json
```

When someone says "use the library" or "use the package", check whether they mean:

- the global CLI command `aipanel`
- importing `aipanel-cli` into TypeScript code

## Command Shapes

List providers:

```bash
aipanel providers --json
```

Consult:

```bash
aipanel consult "この設計どう？" [--provider <name>] [--cwd <dir>] [--file <path>] [--diff <path>] [--log <path>] [--model <name>] [--timeout <ms>] [--json]
```

Follow up on an existing session:

```bash
aipanel followup --session <sessionId> "この修正方針で進めていい？" [--provider <name>] [--cwd <dir>] [--model <name>] [--timeout <ms>] [--json]
```

Debug:

```bash
aipanel debug "この不具合の根本原因は？" [--provider <name>] [--cwd <dir>] [--file <path>] [--diff <path>] [--log <path>] [--model <name>] [--timeout <ms>] [--json]
```

## Good Examples

Repository source execution:

```bash
npm run dev -- consult "このログから原因わかる？" --cwd ./repo --log logs/app.log --file src/server.ts --model sonnet --json
```

Built CLI:

```bash
npm start -- consult "この差分レビューして" --provider codex --cwd ./repo --file src/server.ts --log logs/app.log --json
```

Global install:

```bash
aipanel debug "この不具合の根本原因は？" --cwd ./repo --file src/cache.ts --log logs/error.log --model sonnet --json
```

## Runtime Notes

- `--cwd` affects both provider execution and relative path resolution for `--file`, `--diff`, and `--log`.
- `--model` is passed through to the selected provider.
- If `--model` is omitted, `.aipanel/profile.yml` `defaultModel` is preferred, then the provider default is used.
- `defaultProvider` in `.aipanel/profile.yml` can switch the default provider to `claude-code` or `codex`.
- `AIPANEL_STORAGE_ROOT` overrides where sessions, runs, and artifacts are stored.
- `followup` rebuilds context from `aipanel` session history instead of using native provider resume state as the system of record.
- In `debug`, `--timeout` applies to each orchestrated provider call, so end-to-end runtime can be much longer than the single timeout value.

Profile example:

```yaml
defaultProvider: claude-code
defaultModel: sonnet
defaultTimeoutMs: 120000
```

Temporary storage example:

```bash
AIPANEL_STORAGE_ROOT="$(mktemp -d)" aipanel consult "Reply with exactly: ready" --json --timeout 30000
```

## Packaging And Publish Checks

When the question is about package distribution, use package name `aipanel-cli`.

Recommended checks:

```bash
npm run build
npm pack --dry-run
npm run verify:package
npm run publish:check
```

Expected install checks:

```bash
npm install -g aipanel-cli
aipanel providers --json
```
