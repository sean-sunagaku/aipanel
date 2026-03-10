# Option 5: Multi-Agent Job Orchestrator

## Summary
1 つの相談や不具合に対して、collector / planner / provider reviewer / merger / validator の役割を分け、複数の処理を束ねて結果を返す構成である。

## Structure
```text
consultation job
  -> planner
  -> context collector
  -> provider reviewer A
  -> provider reviewer B
  -> merger
  -> validator
  -> final renderer
```

## Responsibility Boundary
- planner: 質問を小さな観点に分解する
- collector: 必要な context を収集する
- provider reviewers: 各 provider / 各役割で並列評価する
- merger: 複数出力を要約・統合する
- validator: 矛盾や見落としを再点検する

## Future Integration In aipanel
`aipanel` では、この役割群を独立した別基盤として導入するのではなく、`CLI Broker + Run-Centric Ledger` の内部へ追加する想定で扱う。

具体的には、以下のように `Run` 配下の role / task として載せる。

| Role | `aipanel` 内での置き場所 | 主な責務 |
|---|---|---|
| planner | `PlanBuilder` / `TaskPlanner` | 問いを観点ごとに分解し task plan を作る |
| collector | `ContextCollectorTask` | 必要なファイル、差分、ログ、既存 session を集める |
| provider reviewer | `ProviderTaskRunner` | 各 provider に観点別の問いを投げる |
| merger | `ResultMerger` | task 結果を統合し比較可能な形へ整える |
| validator | `ValidationRunner` | 結論の矛盾、抜け漏れ、追加調査の必要性を点検する |

この位置づけにより、multi-agent は「別プロダクト」ではなく、`Run` の execution mode の一つとして管理できる。

## Merits
- `他の AI にも聞きたい` を自然に実現できる
- 難しい bug investigation や設計比較に強い
- compare の価値を一段上げやすい
- 役割ごとに出力を分けられるため、判断材料を整理しやすい

## Demerits
- 単発コマンドには重い
- orchestration の失敗点が増える
- context の粒度が悪いとノイズも増幅される
- broker や session 層がない状態では責務が散らかりやすい

## Best Fit
- 難度の高い相談を段階的に深掘りしたい
- compare を単なる横並び表示ではなく、役割分担つきの調査体験にしたい
- provider 差だけでなく、観点差も扱いたい

## Main Risk
これを基盤そのものとして採ると、session 設計・artifact 設計・UI 設計が同時に複雑化する。  
`multi-agent` は強いが、土台なしで始めると `aipanel` 全体の責務が崩れやすい。

## Correct Positioning
この案は独立した第 1 アーキテクチャというより、`CLI Broker` の上に載る第 2 段の機能である。  
よって、本シリーズでは「中核案」ではなく「推奨増築案」として扱う。
