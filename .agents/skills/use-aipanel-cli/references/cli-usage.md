# CLI Usage

## Scope

`aipanel-cli` is a TypeScript CLI broker and orchestrator for Claude Code and Codex.
Phase 1 currently supports:

- providers: `claude-code`, `codex`
- commands: `providers`, `consult`, `followup`, `debug`, `plan`
- persistence owned by `aipanel`: `Session`, `Run`, `Artifact`

`compare` is not part of phase 1.

## Setup

Build from the repository:

```bash
corepack enable
pnpm install
pnpm run build
```

Quick checks:

```bash
node dist/bin/aipanel.js providers --json
pnpm start providers --json
pnpm run dev providers --json
```

`make install`, `make build`, `make smoke`, and `make dev` are equivalent shortcuts when `Makefile` is available.

## Installed Package Usage

The published package name is `aipanel-cli`.

```bash
pnpm add -g aipanel-cli
aipanel providers --json
```

When someone says "use the package", assume they mean the CLI unless they explicitly ask about exports.

## Command Shapes

List providers:

```bash
aipanel providers --json
```

Consult:

```bash
aipanel consult "この設計どう？" [--provider <name[:model]>]... [--timeout <ms>] [--json]
```

Follow up on an existing session:

```bash
aipanel followup --session <sessionId> "この修正方針で進めていい？" [--provider <name[:model]>] [--timeout <ms>] [--json]
```

Debug:

```bash
aipanel debug "この不具合の根本原因は？" [--provider <name[:model]>]... [--timeout <ms>] [--json]
```

Plan:

```bash
aipanel plan "この計画をレビューして" [--file <path>] [--provider <name[:model]>]... [--timeout <ms>] [--json]
```

## Good Examples

Repository source execution:

```bash
pnpm run dev consult "この設計どう？" --provider claude-code:claude-sonnet-4-5 --provider codex:codex-reviewer --json
```

Repository source execution for plan review:

```bash
pnpm run dev plan "この計画をレビューして" --file docs/plan.md --provider codex --json --timeout 600000
```

Built CLI:

```bash
pnpm start consult "この差分レビューして" --provider codex:codex-reviewer --provider codex:codex-reviewer --json
```

Global install:

```bash
aipanel debug "この不具合の根本原因は？" --provider claude-code:claude-sonnet-4-5 --provider codex:codex-reviewer --json
```

## Runtime Notes

- review 系 command は repeatable `--provider` を公開する。`provider:model` を使うと model override を指定できる。同じ provider を複数回書けば別インスタンスとして並列実行される。
- `consult` / `followup` / `debug` / `plan` の `--json` 出力は常に batch shape で返る。単発でも `results.length === 1`。
- `defaultProvider` in `.aipanel/profile.yml` can switch the default provider to `claude-code` or `codex`.
- `AIPANEL_STORAGE_ROOT` overrides where sessions, runs, and artifacts are stored.
- `followup` rebuilds context from `aipanel` session history instead of using native provider resume state as the system of record.
- `plan` では positional question が必須で、`--file` は任意。添付した計画書は prompt、run ledger、session history に保存されるので、同じ session の `followup` でも再利用できる。
- In `debug` and `plan`, `--timeout` applies to each orchestrated provider call, so end-to-end runtime can be much longer than the single timeout value.

Profile example:

```yaml
defaultProvider: claude-code
defaultTimeoutMs: 300000
```

> **Note**: Codex provider は起動に時間がかかるため `defaultTimeoutMs` は `300000`（5分）以上を推奨。`120000` だとタイムアウトしやすい。`debug` と `plan` は各タスクごとに timeout が適用されるため、end-to-end は 3 倍以上かかる可能性がある。

Temporary storage example:

```bash
AIPANEL_STORAGE_ROOT="$(mktemp -d)" aipanel consult "Reply with exactly: ready" --json --timeout 30000
```

## Updating In Another Repository

When the question is about updating `aipanel-cli` inside the user's own repository, prefer repo-local installation over global installation so the version is pinned in `package.json` and lockfile.

Recommended update flow for repo-local usage:

```bash
pnpm outdated aipanel-cli
pnpm up -D aipanel-cli
pnpm exec aipanel providers --json
```

If they only use a global install:

```bash
pnpm add -g aipanel-cli@latest
aipanel providers --json
```

After the version bump, remind them to:

- run one lightweight `consult` smoke check
- run one `followup` on temporary storage if their workflow depends on session persistence
- review wrapper scripts, Makefile targets, CI jobs, and git hooks that hardcode flags, provider names, or timeout values
- re-check `.aipanel/profile.yml` defaults such as `defaultProvider` and `defaultTimeoutMs`

## Development Workflow Integration

The repository includes Makefile targets and git hooks for self-review using aipanel.

### Makefile Targets

```bash
# staged diff を Codex にレビューさせる
make ai-review

# ブランチ全体を debug (3段分析) でレビュー
make ai-review-deep

# Plan ファイルを添削させる
make ai-plan FILE=docs/plan.md

# セッション継続
make ai-followup SESSION=session_xxx QUESTION="この修正方針で進めていい？"

# git hooks を有効化
make hooks-install
```

Defaults: `AI_PROVIDER=codex`, `AI_TIMEOUT=600000`. Override per-call:

```bash
make ai-review AI_PROVIDER=claude-code AI_TIMEOUT=900000
```

### Git Hooks

After `make hooks-install`:

- `pre-commit`: staged diff を `consult` で軽量レビュー (non-blocking)
- `pre-push`: ブランチ全体を `debug` で深いレビュー (non-blocking)

Both hooks are non-blocking by default. To make them blocking, parse `REVIEW_VERDICT: pass|warn|block` from the response.

### Verdict Protocol

Review prompts ask the provider to output a first-line verdict:

- `REVIEW_VERDICT: pass|warn|block` — for code review
- `PLAN_VERDICT: good|revise` — for plan review

This makes automated parsing reliable without prose analysis.

## Packaging And Publish Checks

When the question is about package distribution, use package name `aipanel-cli`.

Recommended checks:

```bash
pnpm run build
pnpm pack --dry-run
pnpm run verify:package
pnpm run publish:check
```

Expected install checks:

```bash
pnpm add -g aipanel-cli
aipanel providers --json
```
