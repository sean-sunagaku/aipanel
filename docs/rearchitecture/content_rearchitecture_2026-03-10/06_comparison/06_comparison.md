# Architecture Comparison

## Comparison Table

| Option | Delivery Speed | Operational Simplicity | Interactive Depth | Debugging Fit | Comparison Fit | Cross-Project Reuse | Cross-Client Reuse | Migration Flexibility | Overall Note |
|---|---|---|---|---|---|---|---|---|---|
| 1. Thin Wrapper | Very High | High | Low | Medium | Low | Medium | Low | Low | 最速だが積み上がりにくい |
| 2. CLI Broker | High | High | High | High | High | High | High | High | 現実解として最もバランスが良い |
| 3. Local Daemon | Medium | Medium-Low | High | High | Medium | High | Medium | High | 長期運用には強いが初手は重い |
| 4. MCP Server | Medium-Low | Medium | Medium | Medium | Medium | High | Very High | High | 公開基盤として美しいが初手には重い |
| 5. Multi-Agent Job Orchestrator | Medium | Medium | Medium-High | Very High | Very High | Medium-High | Medium | Medium-High | みんなで解く体験に最も近い |

## Comparative Readout
- `Thin Wrapper` は最速だが、session・artifact・compare の価値が `aipanel` に積み上がりにくい
- `CLI Broker` は今ほしい機能を最小限の構造でまとめられ、将来の進化先も残せる
- `Local Daemon` は長時間 job に強いが、今のフェーズでは運用コストが先に立つ
- `MCP Server` は broker の公開面としては強いが、初手の本体としては少し重い
- `Multi-Agent Job Orchestrator` は体験価値が高いが、単独の土台として始めるより broker の中で管理した方が扱いやすい

## Decision Lens
今回の採用は、「Option 2 を選ぶか」「Option 5 を選ぶか」の二択ではない。  
`aipanel` の現実解は、`CLI Broker` をベースにしつつ、`Multi-Agent Job Orchestrator` の planner / executor / merger / validator を broker の内部設計として取り込む形である。

## Adopted Shape
- 外側のアーキテクチャは `CLI Broker`
- 内側の実行管理には `Multi-Agent Job Orchestrator` の要素を組み込む
- 詳細なクラス責務とデータ所有権は [Broker + Orchestrator Internal Design](../../broker_orchestrator_design_2026-03-10/00_overview/00_overview.md) で 5 パターン比較する

## Final Decision
`aipanel` の 2026-03-10 時点の最適解は、`CLI Broker` をベースアーキテクチャに採用し、その内部で `Multi-Agent Job Orchestrator` を管理可能な構造を最初から確保しておく方針である。
