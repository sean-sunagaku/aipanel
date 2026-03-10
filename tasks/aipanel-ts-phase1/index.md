# aipanel TS Phase 1 Task Index

## Status Summary
- `done`: 7
- `doing`: 0
- `todo`: 0
- `blocked`: 0

## Execution Order
1. `TASK-00` TS runtime rebase for canonical docs
2. `TASK-01` Claude Code adapter contract spike
3. `TASK-02` Node CLI foundation
4. `TASK-03` Session / Run / Artifact persistence
5. `TASK-04` Direct mode commands
6. `TASK-05` Debug orchestrated mode
7. `TASK-06` Hardening and phase 2 hooks

## Tracker

| ID | Title | Status | Owner | Depends On | File | Notes |
|---|---|---|---|---|---|---|
| TASK-00 | Rebase canonical docs to TS runtime | done | main | - | `tasks/aipanel-ts-phase1/TASK-00-ts-runtime-doc-rebase.md` | README / formal architecture / implementation plan を TS 前提へ更新 |
| TASK-01 | Lock Claude Code adapter contract | done | main | TASK-00 | `tasks/aipanel-ts-phase1/TASK-01-claude-adapter-contract.md` | `-r` は補助扱い、session 正本は `aipanel` として固定 |
| TASK-02 | Scaffold TypeScript CLI foundation | done | main | TASK-01 | `tasks/aipanel-ts-phase1/TASK-02-node-cli-foundation.md` | `bin`, `src/app`, `src/providers`, `src/output`, `CommandRouter` を実装 |
| TASK-03 | Implement persistence models | done | main | TASK-01, TASK-02 | `tasks/aipanel-ts-phase1/TASK-03-persistence-models.md` | `Session / Run / Artifact` entity と file-based repository を実装 |
| TASK-04 | Implement direct mode commands | done | main | TASK-02, TASK-03 | `tasks/aipanel-ts-phase1/TASK-04-direct-mode-commands.md` | `providers / consult / followup` を実装して実 Claude smoke まで確認 |
| TASK-05 | Implement debug orchestrated mode | done | main | TASK-03, TASK-04 | `tasks/aipanel-ts-phase1/TASK-05-debug-orchestrated-mode.md` | `debug` の multi-role task flow と context artifact 追跡を実装 |
| TASK-06 | Harden phase 1 and leave phase 2 hooks | done | main | TASK-05 | `tasks/aipanel-ts-phase1/TASK-06-hardening-and-hooks.md` | README / docs / test scripts / E2E を追加し、phase 2 hook を明文化 |

## Active Blockers
- None.

## Ready Queue
- None. phase 1 実装と検証は完了。

## Done Log
- 2026-03-10 13:50 JST: `TASK-00` 完了。正式 docs と implementation plan を TypeScript / Node.js 前提へ更新。
- 2026-03-10 14:00 JST: `TASK-01` 完了。Claude Code の `-r` は補助扱い、session 正本は `aipanel` とする方針を固定。
- 2026-03-10 14:44 JST: `TASK-02` 〜 `TASK-05` 実装完了。`providers / consult / followup / debug` と file-based persistence を実装。
- 2026-03-10 14:44 JST: `npm run typecheck`, `npm test`, `npm run build` が通過。
- 2026-03-10 14:44 JST: built CLI を使う integration test と E2E test を追加。
- 2026-03-10 14:44 JST: 実 Claude Code を使う `providers / consult / followup / debug` smoke を確認。
