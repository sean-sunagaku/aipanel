# aipanel Rearchitecture Overview

## Document Status
- Status: Draft
- Last Updated: 2026-03-10
- Audience: `aipanel` の初期設計・実装を進める人
- Source Inputs:
  - 2026-03-10 時点の README
  - `docs/rearchitecture/content_rearchitecture_2026-03-10` の既存比較メモ

## このシリーズの役割
このシリーズは、`aipanel` をどのアーキテクチャで立ち上げるかを決め、その後の実装で迷わないための判断材料をまとめるものである。

今回の主眼は、単なる案出しではない。  
`ask`, `consult`, `debug`, `followup`, `compare` を継続的に育てられる土台を決め、あとから provider や client を増やしても破綻しにくい構造に揃えることを目的とする。

## 現状のシステム形状
2026-03-10 時点では、TypeScript 実装がすでに存在し、README と本ドキュメント群に加えて `src/`, `bin/`, `test/` が事実上の仕様ソースになっている。

現時点で確認できる前提は以下である。

- 最初の入口は CLI である
- `aipanel` は provider 非依存の broker / orchestrator を目指す
- phase 1 の provider は Claude Code のみとする
- ただし provider 境界は残し、専用実装には閉じない
- 複数 AI への相談、比較、follow-up、debug を同じ体験として扱いたい
- session と artifact の所有権は provider ではなく `aipanel` 側に寄せたい

つまり、今のテーマは「ゼロからの案出し」ではなく、「実装済み phase 1 を正式アーキテクチャと照合し、次の拡張に耐える形で基準設計を固めること」である。

## 解きたい課題
- 単発相談だけでなく、継続会話と仮説分岐を扱いたい
- まずは Claude Code 単独で相談体験を成立させたい
- その上で phase 2 以降に複数 provider 比較へ広げたい
- ログや差分、対象ファイルを安定して集める `context collector` が必要
- provider 差分を CLI の表面に漏らしすぎたくない
- まだ初期段階なので、daemon や分散実行を初手から持ち込みたくない

## Target Outcomes
- `consultation hub`: 相談・レビュー・デバッグの入口を 1 つにまとめる
- `provider portability`: 当面は Claude Code 単独で進めつつ、将来の追加に対応できること
- `session continuity`: follow-up 可能な session を `aipanel` 側で保持する
- `comparable outputs`: compare しやすい共通出力形へ正規化する
- `cross-project reuse`: repo ごとの差分を profile / config に逃がせるようにする
- `future extensibility`: 後から multi-agent, MCP, local daemon を足せる

## Non-Goals
- 初手から常駐 daemon を前提にすること
- provider ごとの内部 session や UX をそのまま露出すること
- いきなり distributed worker や event sourcing を導入すること
- Claude 専用の閉じたツールとして設計すること
- 書き込み系の自動変更を最初から標準フローにすること

## Design Drivers

| Driver | 何を重視するか |
|---|---|
| Delivery Speed | 最初の usable な CLI を早く出せること |
| Session Ownership | 継続会話と履歴の所有権を `aipanel` 側に置けること |
| Provider Isolation | provider 差分を adapter 境界へ閉じ込められること |
| Debugging Depth | ログ、差分、失敗ケースを安定して渡せること |
| Comparison Quality | 複数 AI の返答を比較可能な形に揃えられること |
| Migration Safety | 後から MCP / daemon / multi-agent を足しても作り直しにならないこと |

## Options At A Glance

| Option | 一言で言うと | 向いている状況 |
|---|---|---|
| [01_thin-wrapper](../01_thin-wrapper/01_thin-wrapper.md) | provider CLI / API を薄く包むだけ | まず数日で価値検証したい |
| [02_cli-broker](../02_cli-broker/02_cli-broker.md) | `aipanel` 自身が相談と状態管理を持つ | 初手から本命の基盤を作りたい |
| [03_local-daemon](../03_local-daemon/03_local-daemon.md) | 常駐プロセスが job と state を一元管理する | 長時間 job と多 client が早期に必要 |
| [04_mcp-server](../04_mcp-server/04_mcp-server.md) | MCP tool として機能を公開する | 複数 client 共有を優先したい |
| [05_multi-agent-job-orchestrator](../05_multi-agent-job-orchestrator/05_multi-agent-job-orchestrator.md) | 役割分担した複数 agent を束ねる | 難しい相談を並列に解きたい |

## 推奨の読み順
1. 本ファイルで前提と判断軸を確認する
2. [02_cli-broker](../02_cli-broker/02_cli-broker.md) を本命案として読む
3. [05_multi-agent-job-orchestrator](../05_multi-agent-job-orchestrator/05_multi-agent-job-orchestrator.md) を増築案として読む
4. [06_comparison](../06_comparison/06_comparison.md) で比較と採用理由を確認する
5. [07_recommended-architecture](../07_recommended-architecture/07_recommended-architecture.md) で採用構成を確定する
6. [10_formal-architecture](../10_formal-architecture/10_formal-architecture.md) で正式採用アーキテクチャを確認する
7. [11_implementation-plan](../11_implementation-plan/11_implementation-plan.md) で実装フェーズを確認する
8. [08_class-design](../08_class-design/08_class-design.md) と [09_data-flow](../09_data-flow/09_data-flow.md) で実装粒度へ落とし込む
9. [12_current-implementation-diagrams](../12_current-implementation-diagrams/12_current-implementation-diagrams.md) で現行実装の構造図とデータ構成図を見る
10. [Broker + Orchestrator Internal Design](../../broker_orchestrator_design_2026-03-10/00_overview/00_overview.md) で内部設計 5 パターンの比較を見る

## Deliverables In This Series
- `00_overview/00_overview.md`
- `01_thin-wrapper/01_thin-wrapper.md`
- `02_cli-broker/02_cli-broker.md`
- `03_local-daemon/03_local-daemon.md`
- `04_mcp-server/04_mcp-server.md`
- `05_multi-agent-job-orchestrator/05_multi-agent-job-orchestrator.md`
- `06_comparison/06_comparison.md`
- `07_recommended-architecture/07_recommended-architecture.md`
- `10_formal-architecture/10_formal-architecture.md`
- `11_implementation-plan/11_implementation-plan.md`
- `08_class-design/08_class-design.md`
- `09_data-flow/09_data-flow.md`
- `12_current-implementation-diagrams/12_current-implementation-diagrams.md`
- [Broker + Orchestrator Internal Design](../../broker_orchestrator_design_2026-03-10/00_overview/00_overview.md)

## One-Line Conclusion
`aipanel` は、まず `CLI Broker` を中核にして Claude Code 単独で session を自前管理し、その上に必要に応じて multi-agent と multi-provider を増築する構成が最も現実的である。
