# Formal Architecture

## Document Status
- Status: Accepted
- Last Updated: 2026-03-11
- Position: `aipanel` の正式採用アーキテクチャ

## Current Code Note
2026-03-11 時点の現行コードでは、専用の `WorkflowSelector`、`src/orchestrator/*`、phase 2 placeholder の `CompareUseCase` は削除済みである。`debug` の orchestrated flow は `DebugUseCase` が内部で role-based task を作り、`RunCoordinator` と `ComparisonEngine` で集約する。

## Decision Statement
`aipanel` の正式アーキテクチャは、外側を `CLI Broker`、内側の実行モデルを `Run-Centric Ledger` とする。

さらに将来的な高度化として、`planner`, `collector`, `provider reviewer`, `merger`, `validator` の multi-agent 的役割は、別システムとして分離せず、`Run` 配下の task / role として broker 内に追加する。

## Why This Is The Official Choice
- CLI-first の立ち上がり速度を維持できる
- session の正本を `aipanel` 側で持てる
- provider 依存を adapter 層へ閉じ込められる
- `debug`, `followup`, 将来の `compare` を同じ内部モデルで扱える
- 複雑な相談だけを orchestrated mode に切り替えられる
- 将来の MCP / daemon 化にもモデルを持ち運びやすい

## Official Provider Scope
現行コードは `claude-code` と `codex` の 2 provider adapter を持つ。  
ただし設計原則は「provider 固有 state を正本にしない」ことで共通である。

したがって、今の正式スコープは以下である。

- concrete adapter は `claude-code`, `codex`
- `ProviderRegistry` と `ProviderAdapter` の境界は残す
- `compare` は phase 2 以降の本格導入対象とする
- orchestrated な役割分担は、まず `debug` の role-based task loop で成立させる

## Official Architecture Summary

### External Architecture
- source entrypoint は `src/cli/aipanel.ts`
- build 後の CLI 実行成果物は `dist/bin/aipanel.js`
- `aipanel` 自体が broker として command を受ける
- provider は外部実行エンジンであり、正本 state は持たせない

### Claude Code Runtime Note
- phase 1 の `ClaudeCodeAdapter` は Node.js の `spawn` で `claude -p --output-format json` を呼ぶ
- 実 provider smoke run は 2026-03-10 の現行環境で `providers / consult / followup / debug` まで確認済み
- automated integration test では fake `claude` binary を使い、CLI / persistence / orchestrated flow を安定検証する
- 完全 headless 環境向けの dedicated PTY strategy は phase 2 hardening 項目として残す

### Internal Execution Architecture
- 会話継続は `Session`
- 1 回の command 実行は `Run`
- `Run` の中に `Task` 群を持つ
- 重い raw payload は `Artifact` に逃がす

### Future Extension Architecture
- simple な command は `direct mode`
- 複雑な command は `orchestrated mode`
- multi-agent 的役割は `Run` の task graph として追加する

## Official DDD Modeling Policy
`aipanel` の正式ドメインモデルは entity-first で定義する。  
つまり、永続化される主要概念は `*Record` ではなく entity 名で扱い、同一性を持たない純粋な値だけを value object に落とす。

### Canonical Aggregate Roots And Entities

| Kind | Canonical Name | Notes |
|---|---|---|
| Aggregate Root | `Session` | 会話継続の正本 |
| Child Entity | `SessionTurn` | `Session` 配下の発話履歴 |
| Aggregate Root | `Run` | 1 command 実行の正本 |
| Child Entity | `RunTask` | `Run` 配下の task |
| Child Entity | `TaskResult` | `RunTask` の結果 |
| Child Entity | `ContextBundle` | `Run` 配下の context snapshot |
| Child Entity | `ProviderResponse` | provider 実行トレース |
| Child Entity | `NormalizedResponse` | provider 出力の正規化結果 |
| Aggregate Root | `Artifact` | 重い raw payload の参照 |
| Entity | `ComparisonReport` | compare や merge の最終報告 |

### Canonical Value Objects
- `ProviderRef`
- `Usage`
- `Citation`
- `TaskDependency`
- `FileRef`
- `DiffRef`
- `LogRef`
- `ConfidenceScore`
- `ExternalRef`

CLI request や output view model は application DTO として扱い、entity には含めない。

## Canonical Structure
```text
clients
  terminal
  Codex wrapper
  future MCP facade

    -> src/cli/aipanel.ts
        -> CommandRouter
        -> UseCases
            -> SessionManager
            -> RunCoordinator
            -> ContextCollector
            -> ProviderRegistry
            -> ResponseNormalizer
            -> ComparisonEngine
            -> ResultRenderer

persistence
  .aipanel/sessions/
  .aipanel/runs/
  .aipanel/artifacts/

providers
  claude-code

future later
  second provider
  local models
```

## Official Module Boundaries

| Module | Responsibility |
|---|---|
| `src/cli/aipanel.ts` | TypeScript の source entrypoint。CLI 入力、引数解析、exit code 制御 |
| `dist/bin/aipanel.js` | build 後に `aipanel` コマンドから起動される成果物 |
| `src/domain` | entity と value object の定義 |
| `src/usecases` | `consult`, `debug`, `followup`, `providers` のアプリケーションフロー |
| `src/session` | `Session` aggregate と `SessionTurn` entity の永続化調停 |
| `src/run` | `Run`, `RunTask`, `TaskResult`, `ContextBundle`, `ProviderResponse`, `NormalizedResponse` の正本管理 |
| `src/context` | ファイル、差分、ログ、metadata の収集 |
| `src/providers` | `claude-code`, `codex` adapter と registry |
| `src/compare` | response 正規化と debug 集約レポート生成 |
| `src/artifact` | `Artifact` entity と export 物の保存 |
| `src/output` | terminal / JSON 向けの最終整形 |

## Official Data Ownership

| Data | Owner | Notes |
|---|---|---|
| `Session` | `aipanel` | aggregate root。会話継続の正本 |
| `SessionTurn` | `aipanel` | `Session` 配下の child entity |
| `Run` | `aipanel` | aggregate root。1 command 実行の正本 |
| `RunTask` | `aipanel` | `Run` 配下の child entity |
| `TaskResult` | `aipanel` | `RunTask` の結果 entity |
| `ContextBundle` | `aipanel` | 何を使って相談したかの trace entity |
| `ProviderResponse` | `aipanel` | provider 実行結果の trace entity |
| `NormalizedResponse` | `aipanel` | 比較や merge 入力の entity |
| `Artifact` | `aipanel` | raw response や log bundle の参照 entity |
| `ComparisonReport` | `aipanel` | compare / merge の最終報告 entity |
| `ProviderRef` | `Session` 配下 | provider native session を指す value object |

## Context And History Policy
`aipanel` はコンテキスト管理と履歴管理の正本を持つ。  
ただし、すべての生データを常時フル保存する方針は採らない。

### Save By Default
- user question
- assistant response summary
- session metadata
- run plan
- task status
- normalized response
- comparison report
- artifact の参照情報
- どの files / diff / logs を使ったかの metadata

### Save As Artifact When Needed
- provider raw text
- provider raw JSON
- 大きなログファイル
- diff bundle
- compare の export 物

### Do Not Treat As Canonical State
- provider 内部だけに存在する会話履歴
- repo 全文スナップショット
- 一時的な prompt build 中間文字列

## Execution Modes

### Direct Mode
- `consult`, `followup`, `providers` などの軽量処理向け
- 基本は 1 run, 1 task
- ただし内部モデル上は必ず `Run` を作る

### Orchestrated Mode
- `debug` 向け
- `Run` 配下に複数 task を作る
- planner / reviewer / validator を role として有効化する
- 現行コードでは `DebugUseCase` が 3 role を直列実行し、`ComparisonEngine` で要約を集約する

## Future Multi-Agent Role Mapping
この節のクラス名は将来案であり、2026-03-11 時点の現行コードに専用モジュールは存在しない。

| Role | Adopted Class Direction | Stored In |
|---|---|---|
| planner | `PlanBuilder`, `TaskPlanner` | `Run.plan`, `RunTask[]` |
| collector | `ContextCollectorTask` | `Artifact`, `ContextBundle` |
| provider reviewer | `ProviderTaskRunner`, `ProviderReviewTask` | phase 1 は Claude Code 単独、phase 2 以降は multi-provider 化 |
| merger | `ResultMerger`, `MergeTask` | merged findings, `ComparisonReport` |
| validator | `ValidationRunner`, `ValidationTask` | validation notes, `Run.status` |

## Canonical Command Mapping

| Command | Primary Flow | Default Mode |
|---|---|---|
| `aipanel consult` | Session start/resume -> Run -> provider execution | direct |
| `aipanel debug` | Session -> Run -> multi-task investigation | orchestrated |
| `aipanel followup` | Existing session -> new run -> provider execution | direct |
| `aipanel providers` | registry lookup only | direct |

## Formal Non-Goals
- 初手から local daemon を mandatory にしない
- provider 固有 session を正本にしない
- event sourcing や distributed worker を最初から持ち込まない
- multi-agent orchestration を broker から独立した別 runtime にしない

## Architectural Rule Set
1. `Session` aggregate と `Run` aggregate を混ぜない
2. 永続化される主要概念は entity として定義し、純粋な値だけを value object にする
3. provider 応答を直接 `Session` に押し込まない
4. compare は `NormalizedResponse` を入力にする
5. multi-agent の役割は `Run` 配下の task / role として記録する
6. raw payload は `Artifact` に逃がし、正本は軽量 metadata に寄せる
7. use case は repository を直接またがず、manager / coordinator 経由で調停する

## Source Of Truth Documents
- [Recommended Architecture](../07_recommended-architecture/07_recommended-architecture.md)
- [Implementation Plan](../11_implementation-plan/11_implementation-plan.md)
- [Class Design](../08_class-design/08_class-design.md)
- [Data Flow](../09_data-flow/09_data-flow.md)
- [Current Implementation Diagrams](../12_current-implementation-diagrams/12_current-implementation-diagrams.md)
- [Broker + Orchestrator Internal Design](../../broker_orchestrator_design_2026-03-10/00_overview/00_overview.md)

## Final Statement
今後の `aipanel` 実装は、本書の方針に従う。  
すなわち、`CLI Broker` を正式な外側アーキテクチャとし、`Run-Centric Ledger` を正式な内側アーキテクチャとし、domain model は entity-first DDD で定義し、将来の multi-agent 拡張もその中へ組み込む。
