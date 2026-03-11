# aipanel

`aipanel` は、Claude Code と Codex を provider として使いながら、相談、継続会話、デバッグ調査を CLI で進めるための TypeScript 製 broker / orchestrator です。

現時点の phase 1 では、`claude-code` と `codex` の direct provider を前提に、`Session / Run / Artifact` を `aipanel` 側で正本管理します。

## Current Status

- phase 1 実装済み
- provider は `claude-code`, `codex`
- 利用可能 command は `providers`, `consult`, `followup`, `debug`
- `compare` は phase 1 の対象外

## Setup

```bash
corepack enable
pnpm install
pnpm run build
```

`Makefile` を使う場合は以下でも同じです。

```bash
make install
make build
```

ビルド後は以下で実行できます。

```bash
node dist/bin/aipanel.js providers --json
pnpm start providers --json
make smoke
```

build 前に source から直接試すなら:

```bash
pnpm run dev providers --json
make dev
```

## Quick Start

最短で使うならこの 4 つです。

```bash
node dist/bin/aipanel.js providers --json
node dist/bin/aipanel.js consult "この設計どう？" --json
node dist/bin/aipanel.js followup --session session_xxx "この続きで確認したい" --json
node dist/bin/aipanel.js debug "この不具合の根本原因は？" --json
```

提出前の標準チェック:

```bash
pnpm run lint
pnpm run typecheck
pnpm test
```

## Worktree Shortcut

`aipanel` 直下の `.worktree/` に Git worktree を増やしたいときは、以下のショートカットが使えます。

```bash
pnpm run worktree:add feature/debug-ui
make worktree-add BRANCH=feature/debug-ui
```

補足:

- 既存の local branch があればその branch をそのまま開きます
- `origin/<branch>` だけ存在する場合は tracking branch を作ります
- どちらもない場合は `HEAD` から新しい branch を作ります
- 配置先は `.worktree/<branch>` です

base を変えたい場合:

```bash
pnpm run worktree:add feature/debug-ui --base origin/main
make worktree-add BRANCH=feature/debug-ui BASE=origin/main
```

一覧確認:

```bash
pnpm run worktree:list
make worktree-list
```

## Package Install

公開後は package として install できます。

```bash
pnpm add -g aipanel-cli
aipanel providers --json
```

2026-03-11 JST 時点で、registry 経由の `pnpm add --dir "$tmpdir" aipanel-cli` と `pnpm --dir "$tmpdir" exec aipanel providers --json` まで確認済みです。

公開前のローカル確認は tarball か `Makefile` で行えます。

```bash
tmpdir="$(mktemp -d)"
pnpm pack --out aipanel-cli-local.tgz
pnpm add --dir "$tmpdir" "$(pwd)/aipanel-cli-local.tgz"
pnpm --dir "$tmpdir" exec aipanel providers --json
rm -f aipanel-cli-local.tgz
```

```bash
make pack-dry-run
make verify-package
```

公開前の最終確認:

```bash
make publish-check
```

公開:

```bash
make publish
```

別レポジトリに組み込むなら、global install より repo-local install を推奨します。チーム全員で同じ版を使いやすく、更新も `package.json` / lockfile で追跡できます。

```bash
pnpm add -D aipanel-cli
pnpm exec aipanel providers --json
```

## Updating The Library In Your Repository

`aipanel-cli` を自分のレポジトリで更新するときは、まず依存関係を上げてから、薄い smoke check とラッパースクリプト見直しを順に行うのが安全です。

repo-local install の場合:

```bash
pnpm outdated aipanel-cli
pnpm up -D aipanel-cli
pnpm exec aipanel providers --json
```

TypeScript import でも使っている場合:

```bash
pnpm up aipanel-cli
pnpm run typecheck
pnpm test
```

global install だけで使っている場合:

```bash
pnpm add -g aipanel-cli@latest
aipanel providers --json
```

更新後の確認ポイント:

- `package.json` / lockfile に上がった version が入っているか
- `pnpm exec aipanel consult "Reply with exactly: ready" --json --timeout 30000` が通るか
- `followup` を使う運用なら、一時 storage で 1 回流して継続できるか
- `Makefile`, `package.json scripts`, CI, `.githooks/` に固定している command / option / timeout を見直す必要がないか
- `.aipanel/profile.yml` の `defaultProvider`, `defaultModel`, `defaultTimeoutMs` が今の運用に合っているか

継続会話や debug の確認を既存データと切り離して行いたい場合は、一時 storage を使うと安全です。

```bash
AIPANEL_STORAGE_ROOT="$(mktemp -d)" pnpm exec aipanel consult "Reply with exactly: ready" --json --timeout 30000
```

## Commands

最短スタート:

```bash
node dist/bin/aipanel.js providers --json
node dist/bin/aipanel.js consult "この設計どう？" --json
node dist/bin/aipanel.js followup --session session_xxx "この修正方針で進めていい？" --json
node dist/bin/aipanel.js debug "この不具合の根本原因は？" --json
```

```bash
node dist/bin/aipanel.js providers [--json]
node dist/bin/aipanel.js consult "<question>" [--provider <name>] [--model <name>] [--timeout <ms>] [--json]
node dist/bin/aipanel.js followup --session <sessionId> "<question>" [--provider <name>] [--model <name>] [--timeout <ms>] [--json]
node dist/bin/aipanel.js debug "<question>" [--provider <name>] [--model <name>] [--timeout <ms>] [--json]
```

補足:

- `--session` は `followup` 専用です。既存 session を引き継ぐときだけ指定します
- `consult` と `debug` は現在の質問からそのまま実行します
- 実装では `as` による型アサーションを避け、必要な分岐は `ts-pattern` を優先します
- `consult` / `debug` に provider native session tracking はありません。継続は `aipanel` 側の session 履歴を使います

repo からのショートカット:

```bash
pnpm start providers --json
pnpm run dev consult "この設計どう？" --json
make run ARGS='debug "この不具合の根本原因は？" --json --timeout 60000'
```

よく使う例:

```bash
node dist/bin/aipanel.js consult "この設計どう？" --json
node dist/bin/aipanel.js consult "この設計どう？" --provider codex --model sonnet --json
node dist/bin/aipanel.js followup --session session_xxx "この修正方針で進めていい？" --model sonnet --json
node dist/bin/aipanel.js debug "この不具合の根本原因は？" --model sonnet --json
```

## Runtime Notes

- `--model` は選択した provider にそのまま渡されます。未指定時は `.aipanel/profile.yml` の `defaultModel` を優先し、さらに未設定なら provider 側の既定を使います
- `AIPANEL_STORAGE_ROOT` を指定すると、session / run / artifact の保存先を切り替えられます
- `followup` は `--session` 必須です。Claude Code / Codex の native resume を正本にせず、`aipanel` 側の session 履歴再構築を基本にしています
- `debug` の `--timeout` は orchestrated mode の各 provider call に適用されるので、合計所要時間は 3 倍近くになることがあります
- `--timeout` の既定値は `120000` (ms) です

例:

```bash
AIPANEL_STORAGE_ROOT="$(mktemp -d)" node dist/bin/aipanel.js consult "Reply with exactly: ready" --json --timeout 30000
```

profile で既定 model を固定したい場合:

```yaml
# .aipanel/profile.yml
defaultProvider: claude-code
defaultModel: sonnet
defaultTimeoutMs: 120000
```

Codex を既定 provider にしたい場合は、`defaultProvider: codex` を指定したうえで `defaultModel` を省略して Codex CLI 側の既定を使うか、使いたい model を明示的に書いてください。

## Storage Layout

デフォルトでは `./.aipanel` 配下に保存します。

```text
.aipanel/
  sessions/
    <sessionId>.json
  runs/
    <runId>.json
  artifacts/
    <runId>/
      <artifactId>.json
      <artifactId>.artifact.json
```

主な保存内容:

- `sessions/`: `Session`, `SessionTurn`
- `runs/`: `Run`, `RunTask`, `TaskResult`, `RunContext`, `ProviderResponse`, `NormalizedResponse`, `ComparisonReport`
- `artifacts/`: run context, provider raw text/json, debug task outputs

## Tests

```bash
pnpm run lint
pnpm run fmt:check
pnpm run typecheck
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
pnpm test
pnpm run audit
```

`Makefile` 経由でも同じ確認ができます。

```bash
make lint
make fmt-check
make typecheck
make test
make audit
```

テストの役割:

- `test:unit`: `ResponseNormalizer`, `ContextCollector`, `SessionManager`
- `test:integration`: built CLI + fake Claude/Codex provider で `providers/consult/followup/debug`
- `test:e2e`: built CLI の永続化込みフルフロー確認
- integration / E2E では `--model` override が効くことを確認

## Verified Smoke Checks

2026-03-11 JST 時点で、以下を実行確認済みです。

- `pnpm run lint`
- `pnpm run fmt:check`
- `pnpm run typecheck`
- `pnpm test`
- `pnpm run audit`
- `pnpm run build`
- `pnpm run verify:package`
- `pnpm run dev providers --json`
- `pnpm start providers --json`
- `make smoke`
- `pnpm add --dir "$tmpdir" aipanel-cli`
- `pnpm --dir "$tmpdir" exec aipanel providers --json`
- `node dist/bin/aipanel.js providers --json`
- 実 Claude Code を使った `consult`
- 実 Claude Code を使った `followup`
- 実 Claude Code を使った `debug`
- 実 Claude Code を使った `consult --model sonnet`

## Repo Skill

- 公開用の `aipanel-cli` 利用ガイド Skill は [skills/use-aipanel-cli/SKILL.md](./skills/use-aipanel-cli/SKILL.md) にあります
- `npx --yes skills add sean-sunagaku/aipanel --skill use-aipanel-cli` で project-level に install できます
- `pnpm dlx skills add sean-sunagaku/aipanel --skill use-aipanel-cli` で install できます
- user-level に入れたい場合は `npx --yes skills add sean-sunagaku/aipanel --skill use-aipanel-cli -g` を使います
- 更新確認は `npx --yes skills check`、更新は `npx --yes skills update` です
- install 後は prompt で `$use-aipanel-cli` を呼ぶと、`aipanel-cli` の導入・実行・import・storage の案内に使えます
- install / build / command usage / TypeScript import / storage layout の入口を 1 本にまとめています

## Architecture Docs

- [Overview](./docs/rearchitecture/content_rearchitecture_2026-03-10/00_overview/00_overview.md)
- [Current Implementation Diagrams](./docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/12_current-implementation-diagrams.md)
- [Comparison](./docs/rearchitecture/content_rearchitecture_2026-03-10/06_comparison/06_comparison.md)
- [Recommended Architecture](./docs/rearchitecture/content_rearchitecture_2026-03-10/07_recommended-architecture/07_recommended-architecture.md)
- [Formal Architecture](./docs/rearchitecture/content_rearchitecture_2026-03-10/10_formal-architecture/10_formal-architecture.md)
- [Implementation Plan](./docs/rearchitecture/content_rearchitecture_2026-03-10/11_implementation-plan/11_implementation-plan.md)
- [Class Design](./docs/rearchitecture/content_rearchitecture_2026-03-10/08_class-design/08_class-design.md)
- [Data Flow](./docs/rearchitecture/content_rearchitecture_2026-03-10/09_data-flow/09_data-flow.md)
- [Broker + Orchestrator Internal Design](./docs/rearchitecture/broker_orchestrator_design_2026-03-10/00_overview/00_overview.md)
- [Package Distribution](./docs/distribution/npm-package.md)
- [Usage Improvement Notes](./docs/usage-review/aipanel-usage-improvements_2026-03-10.md)
