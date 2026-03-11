# Broker + Orchestrator Internal Design Overview

## Historical Note
このディレクトリは設計比較の履歴資料である。2026-03-11 時点の現行コードには、ここで比較している `WorkflowSelector`、`CompareUseCase`、`src/orchestrator/*` 専用クラス群は存在しない。

## Purpose
このディレクトリは、`CLI Broker` を採用したあと、その内部をどの責務単位で設計するかを比較するためのサブシリーズである。

親シリーズでは「外側のアーキテクチャ」を比較した。  
ここではさらに一段深く入り、`CLI Broker` に `Multi-Agent Job Orchestrator` の要素を取り込む前提で、クラス責務とデータ所有権の切り方を 5 パターン比較する。

## Scope
比較対象は以下である。

- `consult`, `debug`, `followup`, `compare` の内部フロー
- planner / executor / merger / validator をどこに置くか
- `Session`, `Run`, `Task`, `Artifact` をどこが所有するか
- テストしやすさと将来の拡張耐性

## Common Assumptions
- 外側の採用方針は `CLI Broker` ベースである
- provider は adapter 経由で呼び出す
- local storage を前提にする
- まずは CLI-first だが、将来の MCP / daemon 化は捨てない
- 難しい相談だけ orchestrated mode へ切り替えられるようにする

## Evaluation Lens

| 観点 | 何を見るか |
|---|---|
| Delivery Speed | 最初に組みやすいか |
| Class Clarity | クラス責務が混ざりにくいか |
| Data Ownership Clarity | `Session`, `Run`, `Task`, `Artifact` の所有権が明確か |
| Session Continuity | follow-up を自然に支えられるか |
| Multi-Agent Fit | planner / fan-out / merge / validate を入れやすいか |
| Testability | unit test / integration test を分けやすいか |
| Migration Safety | 後から MCP / daemon に進化させても破綻しにくいか |

## File Map
- [01_usecase-centric-manager](../01_usecase-centric-manager/01_usecase-centric-manager.md)
- [02_session-centric-aggregate](../02_session-centric-aggregate/02_session-centric-aggregate.md)
- [03_run-centric-ledger](../03_run-centric-ledger/03_run-centric-ledger.md)
- [04_workflow-state-machine](../04_workflow-state-machine/04_workflow-state-machine.md)
- [05_pipeline-stage-bus](../05_pipeline-stage-bus/05_pipeline-stage-bus.md)
- [06_comparison](../06_comparison/06_comparison.md)
- [07_recommended-pattern](../07_recommended-pattern/07_recommended-pattern.md)
- [08_class-design](../08_class-design/08_class-design.md)
- [09_data-flow](../09_data-flow/09_data-flow.md)

## One-Line Preview
- UseCase-Centric Manager: 実装は速いが、複雑化すると責務が散らばる
- Session-Centric Aggregate: follow-up には強いが、session が太りやすい
- Run-Centric Ledger: 実行単位と会話単位を分けられ、管理しやすい
- Workflow State Machine: 安定するが、初期コストが高い
- Pipeline Stage Bus: 拡張性は高いが、抽象化が先行しやすい
