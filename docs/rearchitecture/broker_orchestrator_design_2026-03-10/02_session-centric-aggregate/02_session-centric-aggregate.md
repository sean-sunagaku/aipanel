# Pattern 2: Session-Centric Aggregate

## Summary
`Session` を最上位 aggregate とし、相談実行、follow-up、比較結果、関連 artifact をすべて session にぶら下げて管理する構成である。

## Structure
```text
CommandRouter
  -> SessionApplicationService
      -> SessionAggregate
          -> turns
          -> task plans
          -> task results
          -> comparison reports
          -> provider refs
```

## Class Shape
- `SessionApplicationService` が command 入口になる
- `SessionAggregate` が `turns`, `plans`, `reports` をまとめる
- orchestrator は session 配下の sub-object として動く

## Data Ownership
- `Session` が最も多くのデータを持つ
- `Run` は session 内部の 1 イベントとして記録される
- `Task` も session の一部として保存される

## Merits
- `followup` との相性が非常に良い
- ある session に紐づく履歴を 1 か所で見やすい
- provider conversation ref も集約しやすい

## Demerits
- `Session` が太りやすい
- compare や debug の実行履歴まで全部 session に載せると肥大化する
- 単発 `compare` や `debug` でも無理に session 中心へ寄せることになる

## Best Fit
- 何より継続会話を中心に据えたい
- 実行履歴よりも会話履歴を優先したい

## Main Risk
本来は「会話の継続単位」である session が、「実行ログのゴミ箱」になり、長期的に扱いづらくなる。
