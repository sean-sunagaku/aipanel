# Codex Sub-Agent Workflow

## Goal

Claude CLI ではなく Codex sub-agent に現行実装を読ませて、diagram bundle JSON spec を作らせる。

## Recommended Flow

1. source map を読む
   - `docs/skills/aipanel-diagrams/02_source-map.md`

2. template を読む
   - `docs/skills/aipanel-diagrams/04_diagram-bundle-template.json`
   - `docs/skills/aipanel-diagrams/05_subagent-prompt-template.md`
   - `docs/skills/aipanel-diagrams/subagents/drawio-diagrammer.yaml`

3. sub-agent に依頼する
   - role:
     - `drawio-diagrammer`
   - goal:
     - 現行 `src/` と `docs/rearchitecture/.../12_current-implementation-diagrams` を根拠に diagram bundle JSON を返す
   - output:
     - JSON only
   - save target:
     - `docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json`

4. main agent が JSON を保存する

5. renderer を実行する
   - `node scripts/architecture/render-diagram-bundle.mjs ...`

## Guardrails

- sub-agent には code change をさせず、spec JSON の提案だけをさせる
- spec は phase 1 の現行 runtime に合わせる
- note は使ってよいが、主要 box / edge は current code に基づく
