# aipanel

`aipanel` は、Claude Code を provider として使いながら、相談、継続会話、デバッグ調査を CLI で進めるための TypeScript 製 broker / orchestrator です。

現時点の phase 1 では、`claude-code` 単独 provider を前提に、`Session / Run / Artifact` を `aipanel` 側で正本管理します。

## Current Status

- phase 1 実装済み
- provider は `claude-code` のみ
- 利用可能 command は `providers`, `consult`, `followup`, `debug`
- `compare` は phase 2 予約で、内部 placeholder のみ残している

## Setup

```bash
npm install
npm run build
```

`Makefile` を使う場合は以下でも同じです。

```bash
make install
make build
```

ビルド後は以下で実行できます。

```bash
node dist/bin/aipanel.js providers --json
npm start -- providers --json
make smoke
```

build 前に source から直接試すなら:

```bash
npm run dev -- providers --json
make dev
```

## Package Install

公開後は package として install できます。

```bash
npm install -g aipanel-cli
aipanel providers --json
```

2026-03-10 JST 時点で、registry 経由の `npm install aipanel-cli` と `aipanel providers --json` まで確認済みです。

## Import Usage

CLI だけでなく、package として import できます。

```ts
import { AipanelApp, Session, runCli } from "aipanel-cli";
import { Run } from "aipanel-cli/domain";

const app = new AipanelApp();
const providers = await app.listProvidersUseCase.execute();
console.log(providers.providers);

await runCli(["providers", "--json"]);

const session = Session.create({ title: "Imported session" });
const run = Run.create({
  sessionId: session.sessionId,
  command: "consult",
  mode: "direct",
});
```

現時点で確認している import surface:

- root import: `AipanelApp`, `CommandRouter`, `runCli`, domain entity 群
- subpath import: `aipanel-cli/domain`, `aipanel-cli/providers`, `aipanel-cli/usecases`, `aipanel-cli/shared`

公開前のローカル確認は tarball か `Makefile` で行えます。

```bash
tarball="$(npm pack)"
npm install -g "./${tarball}"
aipanel providers --json
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

## Commands

```bash
node dist/bin/aipanel.js providers [--json]
node dist/bin/aipanel.js consult "<question>" [--cwd <dir>] [--file <path>] [--diff <path>] [--log <path>] [--model <name>] [--timeout <ms>] [--json]
node dist/bin/aipanel.js followup --session <sessionId> "<question>" [--cwd <dir>] [--model <name>] [--timeout <ms>] [--json]
node dist/bin/aipanel.js debug "<question>" [--cwd <dir>] [--file <path>] [--diff <path>] [--log <path>] [--model <name>] [--timeout <ms>] [--json]
```

repo からのショートカット:

```bash
npm start -- providers --json
npm run dev -- consult "この設計どう？" --json
make run ARGS='debug "この不具合の根本原因は？" --json --timeout 60000'
```

よく使う例:

```bash
node dist/bin/aipanel.js consult "この設計どう？" --json
node dist/bin/aipanel.js consult "このログから原因わかる？" --cwd ./repo --log logs/app.log --file src/server.ts --model sonnet --json
node dist/bin/aipanel.js followup --session session_xxx "この修正方針で進めていい？" --model sonnet --json
node dist/bin/aipanel.js debug "この不具合の根本原因は？" --cwd ./repo --file src/cache.ts --log logs/error.log --model sonnet --json
```

## Runtime Notes

- `--cwd` は provider 実行ディレクトリだけでなく、`--file`, `--diff`, `--log` の相対パス解決にも使われます
- `--model` は `claude-code` provider にそのまま渡されます。未指定時は `.aipanel/profile.yml` の `defaultModel`、さらに未設定なら `sonnet` を使います
- `AIPANEL_STORAGE_ROOT` を指定すると、session / run / artifact の保存先を切り替えられます
- `followup` は Claude Code の native resume を正本にせず、`aipanel` 側の session 履歴再構築を基本にしています
- `debug` の `--timeout` は orchestrated mode の各 provider call に適用されるので、合計所要時間は 3 倍近くになることがあります

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

- `sessions/`: `Session`, `SessionTurn`, `ProviderRef`
- `runs/`: `Run`, `RunTask`, `TaskResult`, `ContextBundle`, `ProviderResponse`, `NormalizedResponse`, `ComparisonReport`
- `artifacts/`: context bundle, provider raw text/json, debug task outputs

## Tests

```bash
npm run lint
npm run fmt:check
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm test
npm run audit
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
- `test:integration`: built CLI + fake Claude provider で `providers/consult/followup/debug`
- `test:e2e`: built CLI の永続化込みフルフロー確認
- integration / E2E では `defaultModel` fallback と `--model` override の両方を確認

## Verified Smoke Checks

2026-03-10 JST 時点で、以下を実行確認済みです。

- `npm run lint`
- `npm run fmt:check`
- `npm run typecheck`
- `npm test`
- `npm run audit`
- `npm run build`
- `npm run verify:package`
- `npm run dev -- providers --json`
- `npm start -- providers --json`
- `make smoke`
- `npm install --prefix "$tmpdir" aipanel-cli`
- `import("aipanel-cli")`
- `import("aipanel-cli/domain")`
- `node dist/bin/aipanel.js providers --json`
- 実 Claude Code を使った `consult`
- 実 Claude Code を使った `followup`
- 実 Claude Code を使った `debug`
- 実 Claude Code を使った `consult --model sonnet`

## Repo Skill

- repo-local Codex skill は [.agent/skills/aipanel/SKILL.md](./.agent/skills/aipanel/SKILL.md) にあります
- install / build / command usage / storage inspection / tests / E2E の入口を 1 本にまとめています
- アーキテクチャ図の再生成用 Skill は [.agent/skills/aipanel-diagrams/SKILL.md](./.agent/skills/aipanel-diagrams/SKILL.md) にあります
- Skill の参照ドキュメントは [docs/skills/aipanel-diagrams/00_overview.md](./docs/skills/aipanel-diagrams/00_overview.md) にあります
- draw.io 専用 sub-agent 定義は [drawio-diagrammer.yaml](./docs/skills/aipanel-diagrams/subagents/drawio-diagrammer.yaml) にあります

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
- [NPM Package Distribution](./docs/distribution/npm-package.md)
- [Usage Improvement Notes](./docs/usage-review/aipanel-usage-improvements_2026-03-10.md)
