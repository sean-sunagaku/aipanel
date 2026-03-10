# Pattern 3: Run-Centric Ledger

## Summary
1 回の実行を `Run` として独立管理し、その中に plan, task, result, merge, validation を記録する構成である。  
`Session` は会話の継続単位、`Run` は実行の追跡単位として分離する。

## Structure
```text
CommandRouter
  -> UseCase
      -> RunCoordinator
          -> PlanBuilder
          -> TaskScheduler
          -> TaskExecutor
          -> ResultMerger
          -> ValidationRunner

storage
  SessionRepository
  RunRepository
  ArtifactRepository
```

## Class Shape
- use case は `RunCoordinator` を呼ぶだけに留める
- `RunCoordinator` が planner / scheduler / executor / merger / validator を束ねる
- `SessionManager` は会話単位だけを担当する
- `RunRepository` が実行履歴の正本を持つ

## Data Ownership
- `Session`: 会話継続、turn、provider conversation ref
- `Run`: command 実行単位、plan、status、task result、summary
- `Artifact`: ログ、比較結果、raw output などの重いデータ

## Merits
- 会話単位と実行単位を分けられる
- multi-agent の task 管理を自然に載せられる
- `debug` と `compare` の長い処理を追跡しやすい
- 将来 daemon 化しても `Run` モデルを流用しやすい

## Demerits
- `Session` だけの設計より object 数が増える
- repository が増える分、最初の設計コストはやや高い
- session と run の対応関係を明文化する必要がある

## Best Fit
- 継続会話と複雑な実行の両方を支えたい
- `CLI Broker` に `Multi-Agent` 要素を素直に組み込みたい
- クラス責務とデータ所有権を明確に管理したい

## Main Risk
モデルを増やしたのに境界を曖昧にすると、session と run の責務が再び混ざる。  
ただし境界さえ守れば、この 5 案の中で最も管理しやすい。
