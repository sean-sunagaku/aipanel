# Sub-Agent Prompt Template

以下をそのまま出発点として使う。

```text
現行 aipanel 実装の full architecture diagram bundle spec JSON を作成してください。

対象図:
- architecture-overview
- direct-mode-data-flow
- debug-orchestrated-data-flow
- core-class-diagram
- persistence-data-model

返却形式:
- JSON only
- top-level shape:
  {
    "version": 1,
    "title": "...",
    "runtimeScope": "...",
    "indexFileName": "12_current-implementation-diagrams.md",
    "diagrams": [...],
    "readingGuide": [...],
    "dataStructureNotes": [...]
  }

diagram item shape:
- {
    "filename": "...",
    "summary": "...",
    "diagram": {
      "id": "...",
      "title": "...",
      "width": 1600,
      "height": 1000,
      "nodes": [{ "id": "...", "x": 0, "y": 0, "width": 100, "height": 80, "label": "...", "styleType": "app" }],
      "edges": [{ "id": "...", "source": "...", "target": "..." }]
    }
  }

styleType は header, entry, app, usecase, service, provider, persistence, domain, note のみ。

根拠として見る場所:
- src/app
- src/usecases
- src/session
- src/run
- src/context
- src/artifact
- src/providers
- src/domain
- docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams
- .agent/skills/aipanel-diagrams/references/02_source-map.md

guardrails:
- phase 2 構想を primary box に入れない
- direct と orchestrated は別図
- persistence-data-model では Session / Run / Artifact と artifact link を明示
- data structure の変更がある場合は core-class-diagram との整合も取る
- 説明文やコードフェンスは付けない
```
