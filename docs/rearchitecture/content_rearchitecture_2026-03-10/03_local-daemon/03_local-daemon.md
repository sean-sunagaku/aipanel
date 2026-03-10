# Option 3: Local Daemon

## Summary
CLI の背後にローカル常駐プロセス `aipaneld` を置き、job、session、artifact、再試行、履歴を集中管理する構成である。

## Structure
```text
terminal / editor / future GUI
  -> aipanel client
      -> local daemon (aipaneld)
          -> job scheduler
          -> session store
          -> provider adapters
          -> artifact store
          -> observability hooks
```

## Responsibility Boundary
- client: UI と command 入力のみ
- daemon: 実行状態、ジョブ進行、session、再試行、並列制御
- provider adapters: daemon 内で実行
- storage: daemon が一元管理

## Merits
- 長時間の debug / consult job を扱いやすい
- 中断、再開、再試行、バックグラウンド実行を自然に持てる
- multi-agent や queue 制御との相性が良い
- observability を載せやすい

## Demerits
- 初期導入が重い
- 開発環境や OS ごとの運用差分が増える
- 個人利用の初期 CLI には過剰になりやすい
- daemon のライフサイクル自体が別の複雑さを持つ

## Best Fit
- 長時間 job が多い
- 複数 client から同じ state に接続したい
- チーム基盤として安定運用したい

## Main Risk
プロダクト価値よりも運用設計が先に来る。  
`aipanel` がまだ CLI の本質体験を固めていない段階で daemon を入れると、変更速度が大きく落ちる可能性が高い。

## Why It Is Not The First Step
将来的には有力な進化先だが、2026-03-10 時点の `aipanel` はまだ「何をどの単位で保存し、どう比較して返すか」を固めている段階である。  
まずは broker 型 CLI で責務を定義してから、必要になった時点で daemon 化する方が安全である。
