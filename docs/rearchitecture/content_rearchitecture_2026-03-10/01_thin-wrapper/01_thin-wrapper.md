# Option 1: Thin Wrapper

## Summary
各 provider の CLI / API をその都度呼び出すだけの最小構成である。  
`aipanel` 自身は薄い引数整形と表示だけを担い、session や比較、artifact の管理はほぼ持たない。

## Structure
```text
user
  -> aipanel thin wrapper
      -> prompt builder
      -> provider CLI / API
      -> raw output renderer
```

## Responsibility Boundary
- `aipanel`: 引数解釈、簡単な prompt 組み立て、標準出力への表示
- provider: 実質的な会話状態、レスポンス生成、場合によっては履歴保持
- local storage: 必要最低限の設定だけを保存

## Merits
- 最速で試せる
- 実装量が最も少ない
- provider ごとの差を観察しやすい
- `ask` や単発 `consult` の PoC には向く

## Demerits
- `followup` を `aipanel` で制御しづらい
- compare のための出力正規化が後付けになりやすい
- debug 用の context 収集が毎回ぶれやすい
- provider をまたいだ session 統一モデルが育たない

## Best Fit
- 数日で価値検証だけしたい
- 対応コマンドが単発問い合わせ中心
- provider adapter の手触りを先に知りたい

## Main Risk
入口は早く作れるが、知見が `aipanel` に蓄積しない。  
使うほど wrapper script が増え、session・artifact・compare の責務が後から剥がしにくくなる。

## Why It Is Not The Recommendation
`aipanel` が目指しているのは「単なる provider 起動器」ではなく、「継続会話・比較・デバッグの基盤」である。  
そのため、薄い wrapper は PoC としては有効でも、本命アーキテクチャには向かない。
