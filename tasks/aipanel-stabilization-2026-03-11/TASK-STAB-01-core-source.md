# TASK-STAB-01: Stabilize Core Source Edits and Type-Safety Changes

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 14:39 JST

## Goal
- `src/` 側に入っている途中変更を安全に収束させる。
- `as` 撤去や命名整理の途中で壊れた箇所を直し、型安全な分岐へ寄せる。

## Parent / Depends On
- Parent: `tasks/aipanel-stabilization-2026-03-11/index.md`
- Depends On: none

## Done When
- `src/` 配下でコンパイル不能な差分が解消されている。
- `as` 由来の型崩れを戻さずに、分岐を `ts-pattern` か素直な型付き条件分岐へ整理できている。
- 変更意図が README / docs と明らかに食い違わない。

## Checklist
- [x] 破損しやすい `src` ファイルを棚卸しする
- [x] `DebugUseCase` / provider adapter / repository 周りの壊れた差分を修正する
- [x] `as` 全面禁止方針に沿って型安全な書き方へ寄せる

## Progress Log
- 2026-03-11 14:27 JST: Task created after interrupted turn to recover partially applied source edits without reverting user work.
- 2026-03-11 14:31 JST: `literalTuple` と `cliPayloads` の type error を修正し、`lint` / `typecheck` を green 化。
- 2026-03-11 14:34 JST: `src/**/*.ts` の file header と JSDoc を repo 文脈で見直す土台を追加し、source comment 生成・検査ロジックを拡張。

## Blockers
- None

## Verification
- 2026-03-11 14:31 JST
  - Type: automated test
  - Scope: core source compile gate
  - Command: `pnpm run lint`
  - Result: pass
  - Notes: `src/shared/literalTuple.ts` の JSDoc を含めて lint を通過
- 2026-03-11 14:31 JST
  - Type: automated test
  - Scope: core source type safety
  - Command: `pnpm run typecheck`
  - Result: pass
  - Notes: `test/support/cliPayloads.ts` の literal 型崩れを修正済み

## Decision Log
- 2026-03-11 14:27 JST: Historical task files are treated as completed records; stabilization work is tracked separately to avoid rewriting history.

## Next Action
- Closed
