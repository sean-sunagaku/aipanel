# AIPanel Diagram Skill Docs

`aipanel-diagrams` Skill の参照ドキュメント置き場です。  
このセットは、現行 `aipanel` 実装のアーキテクチャ図を `draw.io` source と `SVG` で再生成・更新・検証するときの canonical guide として扱います。

## What This Covers
- 現行 implementation diagrams の canonical 出力先
- Codex sub-agent を使った spec 生成フロー
- renderer を使った draw.io / SVG 再生成フロー
- SVG 妥当性確認の手順
- どの source file をどの図の根拠にするか

## Entry Points
- [01_generation-workflow.md](./01_generation-workflow.md)
- [02_source-map.md](./02_source-map.md)
- [03_subagent-workflow.md](./03_subagent-workflow.md)
- [04_diagram-bundle-template.json](./04_diagram-bundle-template.json)
- [05_subagent-prompt-template.md](./05_subagent-prompt-template.md)
- [subagents/drawio-diagrammer.yaml](./subagents/drawio-diagrammer.yaml)
