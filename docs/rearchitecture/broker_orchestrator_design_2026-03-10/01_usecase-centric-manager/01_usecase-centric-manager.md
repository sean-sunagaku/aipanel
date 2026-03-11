# Pattern 1: UseCase-Centric Manager

## Historical Note
この文書は設計比較または実装履歴の資料であり、2026-03-11 時点の現行コード構成とは一部異なる。`WorkflowSelector`、`src/orchestrator/*`、`CompareUseCase` placeholder などへの言及は履歴として読むこと。


## Summary
各 command 用の use case が、自分の中で planner / provider 呼び出し / merge / validate までを管理する構成である。  
最小の service object 群で始めやすい。

## Structure
```text
CommandRouter
  -> ConsultUseCase
  -> DebugUseCase
  -> FollowupUseCase
  -> CompareUseCase

each use case
  -> ContextCollector
  -> ProviderRegistry
  -> MergeHelper
  -> ValidationHelper
  -> SessionRepository
```

## Class Shape
- `ConsultUseCase`, `DebugUseCase`, `CompareUseCase` が主調停者になる
- planner / merge / validate は helper class として use case 直下に置く
- `SessionRepository` と `ArtifactRepository` は共通利用する

## Data Ownership
- `Session` は repository が持つ
- `Run` は独立 aggregate を持たず、use case の一時変数で扱う
- `Task` 結果も artifact として直接保存しがちで、実行履歴が散らばりやすい

## Merits
- 最初の実装が速い
- command ごとのフローが読みやすい
- 小規模な `consult` と `compare` なら十分回る

## Demerits
- orchestrator 要素が各 use case に重複しやすい
- `Run` という単位がないため、複雑な job の追跡が難しい
- `debug` と `compare` が複雑になるほど責務が肥大化する

## Best Fit
- まず command を 2 つか 3 つだけ立ち上げたい
- multi-agent をまだ本格導入しない

## Main Risk
`CLI Broker` の内側が「巨大な use case 群」になり、クラス責務もデータ保持も command ごとに崩れやすい。
