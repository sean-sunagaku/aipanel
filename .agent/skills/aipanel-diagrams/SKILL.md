---
name: aipanel-diagrams
description: Use this skill when the user wants to generate, regenerate, update, or validate architecture diagrams for the current aipanel implementation. Triggers include requests for draw.io source, SVG exports, class diagrams, data-flow diagrams, persistence or data-model diagrams, or documentation updates under docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams. Do not use this skill for operating the aipanel CLI itself; use the `aipanel` skill for command usage.
---

# AIPanel Diagrams

## Overview

This skill is the repo-local guide for maintaining architecture diagrams of the current `aipanel` implementation. Use it when the task is to regenerate or update the draw.io source, SVG exports, or the companion Markdown for the current implementation diagrams.

## Workflow

1. Confirm whether the task is about the current implementation diagrams.
   - If the user wants command usage or install help, use `.agent/skills/aipanel/SKILL.md` instead
   - If the user wants current implementation architecture / class / data-flow / persistence diagrams, continue here

2. Load the right references.
   - For the end-to-end generation steps and validation commands, read `../../../docs/skills/aipanel-diagrams/01_generation-workflow.md`
   - For the source file map and expected diagram set, read `../../../docs/skills/aipanel-diagrams/02_source-map.md`
   - For the Codex sub-agent workflow and prompt shape, read `../../../docs/skills/aipanel-diagrams/03_subagent-workflow.md`
   - For the diagram spec shape, read `../../../docs/skills/aipanel-diagrams/04_diagram-bundle-template.json`
   - For a reusable sub-agent prompt starter, read `../../../docs/skills/aipanel-diagrams/05_subagent-prompt-template.md`

3. Prefer the sub-agent + renderer flow.
   - Ask a Codex sub-agent to inspect the implementation and return a diagram bundle JSON spec
   - Save the spec under the target doc directory's `source/` subdirectory
   - Render outputs with `scripts/architecture/render-diagram-bundle.mjs`

4. Re-run validation every time diagrams change.
   - Re-run the renderer
   - Validate generated SVGs with `xmllint --noout`
   - Check file inventory so source and export pairs stay aligned

5. Keep docs in sync.
   - Update `12_current-implementation-diagrams.md` when the diagram set or reading guide changes
   - Update README or architecture docs if the diagram entrypoint moves or the canonical diagram set changes

## Operating Rules

- Treat the implementation in `src/`, `bin/`, and the current rearchitecture docs as the source of truth
- Do not use Claude CLI for diagram generation; use a Codex sub-agent to produce the spec
- Keep `.drawio` source files under the diagram directory's `source/` subdirectory
- Keep the generated diagram spec JSON under the same `source/` subdirectory
- Keep only `.md` and `.svg` at the diagram directory root
- When splitting a flow, prefer separate direct-mode and orchestrated-mode diagrams over one dense mixed diagram
- Include persistence / data-structure coverage whenever diagrams are updated, not only class or flow views

## Quick Prompts

- "Use `$aipanel-diagrams` to spawn a sub-agent, regenerate the current implementation diagrams, and validate the SVGs."
- "Use `$aipanel-diagrams` to update the class diagram after a domain model change."
- "Use `$aipanel-diagrams` to explain which source files should drive the persistence data-model diagram."
