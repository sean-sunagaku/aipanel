# Recommended Internal Pattern

## Recommended Direction
`CLI Broker` の内部設計は、`Run-Centric Ledger` を採用する。

つまり、`Session` は会話継続の正本として維持しつつ、各 command 実行は独立した `Run` として保存し、その中で plan, task, merge, validation を管理する。

## Why This Fits Best
- `CLI Broker` の command ごとの入口を保てる
- Claude Code 単独でも `Multi-Agent` 的な task 群を自然に run 配下へ置ける
- `Session` を必要以上に太らせずに済む
- `debug` や `compare` の長い処理を、会話履歴とは別に追跡できる
- 将来 daemon 化しても `Run` モデルをそのまま持っていきやすい

## Adopted Shape
```text
CommandRouter
  -> UseCase
      -> SessionManager
      -> RunCoordinator
          -> PlanBuilder
          -> TaskScheduler
          -> TaskExecutor
          -> ResultMerger
          -> ValidationRunner
      -> ResultRenderer

repositories
  SessionRepository
  RunRepository
  ArtifactRepository
```

## Data Ownership Rule
- `Session`: 会話履歴、provider conversation ref、resume 用 metadata
- `Run`: 1 実行分の plan、task status、summary、final result
- `Artifact`: raw output、log bundle、comparison export など重いデータ

phase 1 では `provider conversation ref` は Claude Code 用の参照のみを保持する。  
ただしデータ構造自体は、将来 2 つ目の provider を追加できる形で持つ。

## Direct Mode And Orchestrated Mode
- direct mode: 単純な `consult` や `followup` は最小 task で実行する
- orchestrated mode: 難しい `debug` や `compare` は複数 task を計画して実行する

どちらの mode でも `Run` を作ることで、内部モデルを一本化できる。

## Future Multi-Agent Roles
将来的に追加したい `05_multi-agent-job-orchestrator` の役割は、`Run-Centric Ledger` では以下のように取り込む。

| Multi-Agent Role | 採用後の置き場所 | 扱い |
|---|---|---|
| planner | `PlanBuilder` / `TaskPlanner` | `Run.plan` を生成する |
| collector | `ContextCollectorTask` | `Run` の入力コンテキストを拡張する |
| provider reviewer A/B | `TaskExecutor` + `ProviderTaskRunner` | phase 1 は Claude Code の観点別 task、phase 2 以降は provider 別 task として走る |
| merger | `ResultMerger` | `TaskResult[]` を `MergedFinding` へ統合する |
| validator | `ValidationRunner` | merged result を再点検し、追加 task が必要か判断する |

ポイントは、これらの役割を `Session` に直接ぶら下げないことと、`Run` の task / result / validation として管理することである。

## Linked Docs
- [Class Design](../08_class-design/08_class-design.md)
- [Data Flow](../09_data-flow/09_data-flow.md)

## Final Recommendation
外側は `CLI Broker`、内側は `Run-Centric Ledger`。  
この二段構成が、`aipanel` にとって最も実装しやすく、あとから育てやすい。
