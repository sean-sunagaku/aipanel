# TASK-06: Hardening and phase 2 hooks

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-10 14:43 JST

## Goal
- phase 1 の完成度を上げつつ、phase 2 の second provider / compare / richer multi-agent に備える

## Parent / Depends On
- Parent: `tasks/aipanel-ts-phase1/index.md`
- Dependencies: `TASK-05`

## Done When
- schema の安定化方針が決まっている
- docs と command surface が一致している
- second provider を足すための hook が残っている

## Checklist
- [x] schema migration 方針を固める
- [x] `NormalizedResponse` の phase 1 範囲を固定する
- [x] compare placeholder の扱いを決める
- [x] docs と examples を同期する
- [x] smoke test 手順を整理する

## Progress Log
- 2026-03-10 13:50 JST: タスク作成
- 2026-03-10 14:43 JST: `npm run typecheck` / `npm test` を green 化
- 2026-03-10 14:43 JST: fake `claude` binary を使う integration test と、実 Claude Code を使う smoke run の両方を整備
- 2026-03-10 14:43 JST: docs の build artifact / provider scope / adapter 実行方式を実装に合わせて更新
- 2026-03-10 14:44 JST: `test:e2e` を追加し、built CLI + 永続化込みの full flow を固定

## Blockers
- None

## Verification
- 2026-03-10 14:43 JST: `npm run typecheck` success
- 2026-03-10 14:43 JST: `npm test` success
- 2026-03-10 14:44 JST: `npm run test:e2e` success
- 2026-03-10 14:44 JST: real Claude Code smoke run (`consult`, `followup`, `debug`) success

## Decision Log
- 2026-03-10 13:50 JST: phase 2 の抽象は残すが、phase 1 の速度を落とすほど先行実装しない
- 2026-03-10 14:43 JST: phase 1 の real Claude Code adapter は `spawn("claude", ...)` で `claude -p --output-format json` を呼ぶ
- 2026-03-10 14:44 JST: 実 provider smoke run は現行環境で確認し、完全 headless 環境向けの専用 PTY 戦略は phase 2 の hardening 候補として残す

## Next Action
- Closed
