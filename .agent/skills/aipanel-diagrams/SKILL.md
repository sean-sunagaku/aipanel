---
name: aipanel-diagrams
description: Create, refresh, and validate the full draw.io/SVG diagram bundle for the `aipanel` repository. Use when the user asks to generate or update architecture diagrams, draw.io source, class diagrams, data-flow diagrams, persistence/data-model diagrams, or the current implementation diagram docs. Prefer the sub-agent-first workflow in this skill over hand-authoring draw.io files.
---

# AIPanel Diagrams

## Overview

Maintain the full current-implementation diagram bundle for `aipanel`.
Prefer a sub-agent to draft the bundle spec JSON, then review, save, render, and validate the outputs from that spec.

## Workflow

1. Read [references/00_overview.md](references/00_overview.md).
2. Read [references/02_source-map.md](references/02_source-map.md) to choose the relevant code evidence.
3. Read [references/03_subagent-workflow.md](references/03_subagent-workflow.md) and [references/05_subagent-prompt-template.md](references/05_subagent-prompt-template.md) before asking a sub-agent for the spec.
4. Save the reviewed spec to `docs/rearchitecture/.../source/current-implementation-diagrams.spec.json`.
5. Run `node scripts/architecture/render-diagram-bundle.mjs ...` to regenerate `.drawio`, `.svg`, and companion Markdown.
6. Validate SVGs with `xmllint --noout`.
7. Update related docs when diagram meaning, scope, or entrypoints changed.

## Guidance

- Treat the spec JSON as the source of truth.
- Update the full bundle when structure changes affect even one diagram.
- Keep `persistence-data-model` and `core-class-diagram` aligned on data-structure changes.
- Keep phase 2 ideas out of primary runtime boxes and edges.
- Use the repo-local references in this folder instead of old `docs/skills/...` paths.

## Reference Map

- Use [references/01_generation-workflow.md](references/01_generation-workflow.md) for the end-to-end flow.
- Use [references/02_source-map.md](references/02_source-map.md) for diagram intent and source files.
- Use [references/03_subagent-workflow.md](references/03_subagent-workflow.md) for the sub-agent handoff flow.
- Use [references/04_diagram-bundle-template.json](references/04_diagram-bundle-template.json) for the spec shape.
- Use [references/05_subagent-prompt-template.md](references/05_subagent-prompt-template.md) for a reusable prompt starter.
- Use [references/subagents/drawio-diagrammer.yaml](references/subagents/drawio-diagrammer.yaml) for the sub-agent contract.
