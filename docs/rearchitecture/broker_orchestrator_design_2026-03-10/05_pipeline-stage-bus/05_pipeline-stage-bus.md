# Pattern 5: Pipeline Stage Bus

## Summary
collector, planner, executor, merger, validator, renderer を stage として分け、各 stage を event bus 的に接続する構成である。

## Structure
```text
UserIntent
  -> ContextStage
  -> PlanningStage
  -> ExecutionStage
  -> MergeStage
  -> ValidationStage
  -> RenderStage
```

## Class Shape
- 各 stage が独立 handler になる
- stage 間は event / envelope でつながる
- repository への保存は stage hook から行う

## Data Ownership
- 各 stage は自分の envelope を生成する
- `Run` は stage 間を流れる carrier object になりやすい
- `Session` と `Artifact` の保存責務が bus 周辺へ分散しやすい

## Merits
- stage の差し替えや追加がしやすい
- 将来 worker 化や分散化へ進めやすい
- processing flow を共通化しやすい

## Demerits
- データの正本が見えづらくなりやすい
- 小さな変更でも stage 間契約の調整が必要
- event 駆動が先に来るとデバッグしにくい

## Best Fit
- 将来の大規模 pipeline を先に見据えたい
- 処理段を明確に入れ替えたい

## Main Risk
設計としてはきれいでも、いま欲しい「クラス責務とデータ保持の明快さ」からは少し遠い。  
抽象度が高く、最初の実装速度も落ちやすい。
