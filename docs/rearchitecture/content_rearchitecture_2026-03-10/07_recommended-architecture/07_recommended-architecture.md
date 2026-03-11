# Recommended Architecture

## Current Code Note
2026-03-11 時点の現行コードでは、専用の `WorkflowSelector`、`src/orchestrator/*`、phase 2 placeholder の `CompareUseCase` は削除済みである。`debug` の orchestrated flow は `DebugUseCase` が `RunCoordinator` と `ComparisonEngine` を使って直接管理する。

## Recommended Direction
`aipanel` は、`Option 2: CLI Broker` を中核に採用し、`Option 5: Multi-Agent Job Orchestrator` の要素を broker 内の実行管理として組み込む構成を推奨する。

つまり、multi-agent は将来の別製品ではなく、`CLI Broker` の中で管理される execution mode の一つとして扱う。

## Why This Is The Pragmatic Choice
- CLI-first のまま最小構成で立ち上げられる
- follow-up を `aipanel` 側で持てる
- phase 1 は Claude Code 単独で始めつつ、provider 追加を adapter 境界へ閉じ込められる
- compare と debug context を同じ broker 基盤に載せられる
- 複雑な相談だけを orchestrated mode に切り替えられる
- MCP / daemon へ進化しても、中核ユースケースを捨てずに済む

## Target Architecture
```text
clients
  terminal
  Codex wrapper
  future MCP facade

    -> src/cli/aipanel.ts
        -> command router
        -> use case services
            -> session manager
            -> run coordinator
            -> context collector
            -> provider registry
            -> response normalizer
            -> comparison engine
            -> result renderer

storage
  .aipanel/profile.yml
  .aipanel/sessions/
  .aipanel/runs/
  .aipanel/artifacts/

providers
  claude-code

future later
  second provider
  local models

optional later
  MCP server facade
  local daemon
```

## Module Boundaries

| Layer | 主責務 |
|---|---|
| `src/cli/aipanel.ts` | TypeScript source entrypoint。引数解析、command 選択、exit code 制御 |
| `dist/bin/aipanel.js` | build 後の CLI 実行成果物 |
| `src/usecases` | `consult`, `debug`, `followup`, `providers` の実行 |
| `src/session` | session, turn, provider conversation ref の保存・取得 |
| `src/run` | run, task, result, comparison report の保存・取得 |
| `src/context` | ファイル、差分、ログ、対象範囲の収集 |
| `src/providers` | provider registry と adapter 実装 |
| `src/compare` | provider 出力の正規化と debug 集約 |
| `src/output` | terminal 向け表示、JSON 出力、要約整形 |

phase 1 の concrete 実装は `claude-code` adapter のみとする。  
`src/providers` は将来拡張のための境界として先に置いておく。

## Ownership Rules
- `Session`, `Run`, `Artifact` は aggregate root として `aipanel` が持つ
- `SessionTurn`, `RunTask`, `TaskResult`, `ContextBundle`, `ProviderResponse`, `NormalizedResponse` は child / trace entity として扱う
- provider 固有の thread / conversation ID は `Session` 配下の `ProviderRef` value object として保存する
- 集約や比較の入力は raw response ではなく normalized response を使う
- orchestrated な debug 制御は `DebugUseCase` と `RunCoordinator` に閉じ込め、provider adapter そのものへ混ぜない
- CLI request DTO や render 用 view model は entity にしない

## Command Mapping

| Command | 主ユースケース | 想定 mode |
|---|---|---|
| `aipanel consult` | `ConsultUseCase` | direct |
| `aipanel debug` | `DebugUseCase` | orchestrated が主 |
| `aipanel followup` | `FollowupUseCase` | direct が主 |
| `aipanel providers` | `ListProvidersUseCase` | direct |

## Recommended Evolution Path
1. `consult` と `providers` で最小の broker を立ち上げる
2. `session` を導入して `followup` を成立させる
3. `run` と `artifact` を導入して実行単位を分離する
4. Claude Code 単独での normalized response と artifact 管理を固める
5. `DebugUseCase` 内で role-based task loop を回し、orchestrated mode を有効化する
6. 2 つ目以上の provider を本格比較したくなった時点で `compare` を導入する
7. 外部 client 需要が出たら MCP facade を追加する

## Linked Design Docs
- [Formal Architecture](../10_formal-architecture/10_formal-architecture.md)
- [Class Design](../08_class-design/08_class-design.md)
- [Data Flow](../09_data-flow/09_data-flow.md)
- [Broker + Orchestrator Internal Design](../../broker_orchestrator_design_2026-03-10/00_overview/00_overview.md)

## Final Recommendation
`aipanel` は、まず `Claude Code に相談できる broker 型 CLI` として立ち上げ、その内部では `Session` と `Run` を分離しつつ、domain model は entity-first DDD でそろえ、将来の multi-agent と multi-provider 拡張を壊さずに足せる構造を最初から確保しておくべきである。
