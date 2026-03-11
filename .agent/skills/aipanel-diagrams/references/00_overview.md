# AIPanel Diagram Skill Docs

`aipanel-diagrams` Skill の参照ドキュメント置き場です。  
このセットは、現行 `aipanel` 実装のアーキテクチャ図を sub-agent first で更新するときの canonical guide として扱います。一次成果物は diagram bundle spec JSON で、`draw.io` source と `SVG` はその spec から main agent が再生成します。

## What This Covers

- repo-local Skill `.agent/skills/aipanel-diagrams/SKILL.md` の補助文書
- 現行 implementation diagrams の canonical 出力先
- Codex sub-agent を使った full bundle spec 生成フロー
- reviewed spec を renderer で draw.io / SVG へ反映するフロー
- SVG 妥当性確認の手順
- どの source file をどの図の根拠にするか

## Entry Points

- [01_generation-workflow.md](./01_generation-workflow.md)
- [02_source-map.md](./02_source-map.md)
- [03_subagent-workflow.md](./03_subagent-workflow.md)
- [04_diagram-bundle-template.json](./04_diagram-bundle-template.json)
- [05_subagent-prompt-template.md](./05_subagent-prompt-template.md)
- [subagents/drawio-diagrammer.yaml](./subagents/drawio-diagrammer.yaml)
