# TASK-05: Implement debug orchestrated mode

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-10 14:43 JST

## Goal
- Claude Code 単独でも role-based task を持つ orchestrated `debug` を成立させる

## Parent / Depends On
- Parent: `tasks/aipanel-ts-phase1/index.md`
- Dependencies: `TASK-03`, `TASK-04`

## Done When
- `debug` が複数 task を作って `Run` 配下で管理できる
- merger / validator を通した summary が返る
- logs / files / diffs が artifact として追跡できる

## Checklist
- [x] `DebugUseCase` を実装する
- [x] `PlanBuilder` の最小版を入れる
- [x] `TaskScheduler` を入れる
- [x] `TaskExecutor` を入れる
- [x] `ResultMerger` を入れる
- [x] `ValidationRunner` の最小版を入れる
- [x] debug 用 `ContextCollector` を入れる

## Progress Log
- 2026-03-10 13:50 JST: タスク作成
- 2026-03-10 14:43 JST: `planner`, `reviewer`, `validator` の 3 role を Claude Code 単独で回す orchestrated `debug` を実装
- 2026-03-10 14:43 JST: `RunTask[]`, `TaskResult[]`, `ProviderResponse[]`, `NormalizedResponse[]`, `ComparisonReport[]` が 1 run に記録される形を確認

## Blockers
- None

## Verification
- 2026-03-10 14:44 JST: `test/integration/cli.test.ts` と `test/e2e/cli.e2e.test.ts` で `debug` pass
- 2026-03-10 14:44 JST: 実 Claude Code で `node dist/bin/aipanel.js debug "Diagnose in one short sentence." --json --timeout 30000` を確認
- 2026-03-10 14:44 JST: run ledger に 3 task と comparison report が保存されることを test で確認

## Decision Log
- 2026-03-10 13:50 JST: phase 1 の orchestrated mode は Claude Code 観点別 task で始める。multi-provider fan-out は phase 2 へ送る

## Next Action
- Closed
