# Option 2: CLI Broker

## Historical Note
2026-03-11 時点の現行コードでは、専用の `WorkflowSelector` や `src/orchestrator/*` は削除されている。以下は broker 案を比較するための設計オプション資料であり、現在の実装構成そのものではない。

## Summary
`aipanel` 自体を中核 CLI とし、context 収集、provider 呼び出し、session 管理、比較、出力正規化を 1 つの broker に集約する構成である。  
さらに難しいケースでは、broker の内部で planner / executor / merger / validator を管理し、multi-agent 的な実行も同じ基盤の上で扱う。

## Structure
```text
terminal / Codex wrapper / future client
  -> src/cli/aipanel.ts
      -> command router
      -> workflow selector
      -> use case services
          -> session manager
          -> run coordinator
              -> context collector
              -> plan builder
              -> task executor
              -> result merger
              -> validation runner
          -> provider registry
          -> comparison engine
          -> result renderer
```

## Responsibility Boundary
- `src/cli/aipanel.ts`: TypeScript source entrypoint。CLI 引数解析と command dispatch
- use case services: `consult`, `debug`, `followup`, `compare`, `providers`
- `session manager`: 継続会話と provider conversation ref の管理
- `run coordinator`: 1 実行分の plan, task, merge, validation を管理
- provider adapters: provider ごとの差分吸収
- comparison / output: provider 間の正規化と最終表示

## State Ownership
この案では、会話状態の正本は `Session`、実行状態の正本は `Run` として `aipanel` が持つ。  
provider は「推論を実行する外部エンジン」と割り切り、session ID、turn 履歴、task 結果、artifact 参照は `aipanel` 側で保存する。

## Phase 1 Provider Scope
phase 1 では、concrete な provider 実装は `claude-code` のみを持つ。  
ただし `ProviderRegistry` と `ProviderAdapter` の境界は残し、あとから 2 つ目の provider を追加しても broker の内側を壊さない形にする。

## Merits
- `ask`, `consult`, `debug`, `followup` を同じ操作体系に揃えやすい
- まずは Claude Code 単独で始めつつ、provider 追加を adapter 境界へ押し込められる
- session と artifact を自前で持てる
- 単純な direct mode と、複雑な orchestrated mode を同居させやすい
- 後から MCP / daemon へ広げるときも、中核ユースケースを再利用しやすい

## Demerits
- Thin Wrapper より初期設計が必要
- `Session` と `Run` の境界を最初に決めないと中で責務が崩れる
- CLI 層に責務を集めすぎると便利スクリプトの集合へ戻りやすい

## Best Fit
- 初手から本命の基盤を作りたい
- 継続会話と比較をプロダクトの中心に置きたい
- multi-agent 的な深掘りも、別システムにせず同じ CLI で扱いたい

## Main Risk
broker を採るのに、内部の orchestration を行き当たりばったりで足すと、`Session`, `Run`, `Artifact` の責務がすぐ混ざる。  
そのため、内部設計は別途 [Broker + Orchestrator Internal Design](../../broker_orchestrator_design_2026-03-10/00_overview/00_overview.md) で明示的に管理する必要がある。

## Suggested Package Direction
```text
src/cli/aipanel.ts
tsconfig.json
src/app
src/usecases
src/context
src/session
src/run
src/orchestrator
src/providers
src/compare
src/output
.aipanel/sessions/
.aipanel/runs/
.aipanel/artifacts/
```

## Why It Is The Leading Option
この構成は、初期コストを抑えつつ `aipanel` 固有の価値である `session continuity`, `compare`, `debug context`, `provider portability` を全部受け止められる。  
さらに、multi-agent 的な実行も broker の内部設計として管理できるため、本シリーズではこの案を中核アーキテクチャとして推奨する。
