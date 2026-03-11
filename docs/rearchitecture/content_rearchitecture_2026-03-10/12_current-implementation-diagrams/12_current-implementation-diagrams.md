# Current Implementation Diagrams

対象スコープ: phase 1 の現行 TypeScript 実装。provider は claude-code 単独で、Session / Run / Artifact を aipanel 側が canonical state として保持する。

diagram spec は `./source/current-implementation-diagrams.spec.json` に保存し、この bundle から draw.io source と SVG export を再生成する。

## Files

| Diagram | Summary | SVG | Source |
|---|---|---|---|
| architecture-overview | CLI entrypoint から use case, provider, persistence までの全体構成 | [architecture-overview.svg](./architecture-overview.svg) | [architecture-overview.drawio](./source/architecture-overview.drawio) |
| direct-mode-data-flow | consult / followup の direct mode 処理フロー | [direct-mode-data-flow.svg](./direct-mode-data-flow.svg) | [direct-mode-data-flow.drawio](./source/direct-mode-data-flow.drawio) |
| debug-orchestrated-data-flow | debug の orchestrated mode 処理フロー | [debug-orchestrated-data-flow.svg](./debug-orchestrated-data-flow.svg) | [debug-orchestrated-data-flow.drawio](./source/debug-orchestrated-data-flow.drawio) |
| core-class-diagram | 主要クラスと domain entity の関係 | [core-class-diagram.svg](./core-class-diagram.svg) | [core-class-diagram.drawio](./source/core-class-diagram.drawio) |
| persistence-data-model | Session / Run / Artifact を中心にしたデータ構成と保存先 | [persistence-data-model.svg](./persistence-data-model.svg) | [persistence-data-model.drawio](./source/persistence-data-model.drawio) |

## Generation

```bash
node scripts/architecture/render-diagram-bundle.mjs docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams
```

Codex sub-agent が spec JSON を作成し、この renderer が `.drawio` と `.svg` を生成する。

## Diagram Reading Guide

### architecture-overview
- CLI entrypoint から use case、provider boundary、file persistence までの責務分離を見るための図。
- provider は state の正本ではなく、Session / Run / Artifact を aipanel 側が保持する構造を確認する。

### direct-mode-data-flow
- consult / followup の direct flow を対象にする。
- followup は provider native resume を正本にせず、保存済み Session と context artifact から継続する。

### debug-orchestrated-data-flow
- debug の orchestrated flow を独立させ、planner / reviewer / validator が `DebugUseCase` 内で `RunTask` として記録される様子を見る。
- phase 1 では同一 provider の role 別連続実行だが、ledger 上では複数 task / result / artifact に分かれる。

### core-class-diagram
- application class、coordination / infrastructure class、domain entity の 3 層を確認する。
- ProviderRef などの value object は note へ逃がし、主要依存だけを図に残している。

### persistence-data-model
- .aipanel/sessions, runs, artifacts と Session / Run / Artifact の対応関係を見る。
- SessionTurn.artifactIds[]、TaskResult.sourceArtifactIds[]、ContextBundle.metadata.artifactId の artifact link が重要。

## Canonical Data Structure Notes

- Session は aggregate root で、turns[] と providerRefs[] を保持する。
- Run は aggregate root で、tasks[]、taskResults[]、contextBundles[]、providerResponses[]、normalizedResponses[]、comparisonReport を保持する。
- Artifact は raw provider response、context snapshot、export file を保存する補助 root である。
- provider native state は ProviderRef / ExternalRef として参照だけ保持し、canonical history そのものは aipanel 側に持たせる。
