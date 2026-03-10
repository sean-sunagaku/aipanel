# Pattern 4: Workflow State Machine

## Summary
`Run` と `Task` を明示的な状態遷移で管理し、planner, executor, merger, validator もすべて state machine の transition として扱う構成である。

## Structure
```text
UseCase
  -> WorkflowEngine
      -> RunStateMachine
      -> TaskStateMachine
      -> TransitionHandlers
      -> PersistenceHooks
```

## Class Shape
- `WorkflowEngine` が中心になる
- `RunStateMachine` が `created -> planned -> running -> merged -> validated -> completed` を管理する
- 各 transition ごとに handler class を持つ

## Data Ownership
- `Run` が状態遷移を強く持つ
- `Task` は独立した state machine を持つ
- `Session` は別系統の aggregate として連携する

## Merits
- 長い job や再試行に強い
- 非同期処理の状態を見失いにくい
- test で transition を明示的に検証できる

## Demerits
- 初期実装コストが高い
- 単純な command にも state machine の儀式が乗る
- 今のフェーズでは抽象化が過剰になりやすい

## Best Fit
- daemon 化や queue 化を早期に見据えている
- 再試行・中断・再開が product requirement になっている

## Main Risk
正しい設計ではあるが、`aipanel` の現段階では複雑さが先に来る。  
今ほしいのは高信頼 workflow engine より、まず動く broker と明確なデータ境界である。
