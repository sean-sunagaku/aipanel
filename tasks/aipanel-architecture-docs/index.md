# aipanel Architecture Docs Task Index

## Status Summary
- `done`: 2
- `doing`: 0
- `todo`: 0
- `blocked`: 0

## Execution Order
1. `TASK-ARCH-01` Generate current implementation architecture diagrams and data-model docs
2. `TASK-ARCH-02` Replace static generator with Codex sub-agent diagram workflow

## Tracker

| ID | Title | Status | Owner | Depends On | File | Notes |
|---|---|---|---|---|---|---|
| TASK-ARCH-01 | Generate current implementation diagrams | done | main + architecture-reviewer | `tasks/aipanel-ts-phase1/index.md` | `tasks/aipanel-architecture-docs/TASK-ARCH-01-current-implementation-diagrams.md` | draw.io source, SVG export, data structure notes, README / docs links, diagram skill docs |
| TASK-ARCH-02 | Replace static generator with sub-agent workflow | done | main + drawio-diagrammer | `tasks/aipanel-architecture-docs/TASK-ARCH-01-current-implementation-diagrams.md` | `tasks/aipanel-architecture-docs/TASK-ARCH-02-subagent-diagram-workflow.md` | drawio sub-agent definition, spec JSON, generic renderer, docs templates |

## Active Blockers
- None.

## Ready Queue
- None.

## Done Log
- 2026-03-10 16:39 JST: `TASK-ARCH-01` 完了。diagram generator, 5 枚の `.drawio` / `.svg`, docs 導線、repo-local diagram skill と docs companion を追加。
- 2026-03-10 17:05 JST: `TASK-ARCH-02` 完了。static generator を廃止し、Codex sub-agent 用 `drawio-diagrammer` 定義、spec JSON、generic renderer、template docs を追加。
