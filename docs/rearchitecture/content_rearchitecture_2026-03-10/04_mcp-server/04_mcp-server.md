# Option 4: MCP Server

## Summary
`consult`, `debug`, `compare`, `followup` などの機能を MCP tool として公開し、複数 client から同じ API で利用する構成である。

## Structure
```text
any MCP client
  -> aipanel MCP server
      -> use case services
          -> context collector
          -> provider adapters
          -> session repository
          -> comparison engine
```

## Responsibility Boundary
- MCP server: tool schema、認可、入力検証、レスポンス整形
- use case services: broker 案と同じ中核処理
- client: UI 表示と tool 呼び出しだけに集中

## Merits
- cross-client reuse が非常に高い
- tool 境界が明確になり、契約ベースで拡張しやすい
- CLI 以外の agent / desktop client からも再利用しやすい
- チームで共有しやすい公開面を作れる

## Demerits
- 結局は内部に broker 相当の中核処理が必要
- tool schema 設計と互換性維持のコストが増える
- interactive な会話体験は別レイヤで設計する必要がある
- 初手の実装対象が広がりやすい

## Best Fit
- 最初から複数 client 共有が主目的
- team-wide な tooling として配布したい
- `aipanel` のコアがある程度固まっている

## Main Risk
公開インターフェースの整形に意識が向きすぎて、本体の相談体験や session 設計が後回しになる。

## Why It Is A Phase-Two Candidate
`aipanel` の中核ユースケースが固まった後なら非常に強い選択肢である。  
ただし初手では、MCP server 自体よりも「broker として何を持つべきか」を決める方が先である。
