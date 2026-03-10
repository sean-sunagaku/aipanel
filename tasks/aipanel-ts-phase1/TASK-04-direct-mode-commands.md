# TASK-04: Implement direct mode commands

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-10 14:43 JST

## Goal
- `consult`, `followup`, `providers` を direct mode で成立させる

## Parent / Depends On
- Parent: `tasks/aipanel-ts-phase1/index.md`
- Dependencies: `TASK-02`, `TASK-03`

## Done When
- `consult` が Claude Code を呼んで結果を返す
- `followup` が session を使って継続できる
- `providers` が `claude-code` を返す
- `Session` と `Run` が実行ごとに保存される

## Checklist
- [x] `ConsultUseCase` を実装する
- [x] `FollowupUseCase` を実装する
- [x] `ListProvidersUseCase` を実装する
- [x] `SessionManager` を実装する
- [x] `RunCoordinator` の direct path を実装する
- [x] text 出力 renderer を実装する

## Progress Log
- 2026-03-10 13:50 JST: タスク作成
- 2026-03-10 14:43 JST: `consult`, `followup`, `providers` を TypeScript 実装し、`Session` / `Run` / `Artifact` への保存も接続
- 2026-03-10 14:43 JST: Claude Code adapter は timeout / error shaping を備えた subprocess へ harden し、real provider smoke run を通した

## Blockers
- None

## Verification
- 2026-03-10 14:44 JST: `test/integration/cli.test.ts` と `test/e2e/cli.e2e.test.ts` で `providers`, `consult`, `followup` pass
- 2026-03-10 14:44 JST: 実 Claude Code で `node dist/bin/aipanel.js consult "Reply with exactly: ready" --json --timeout 30000` を確認
- 2026-03-10 14:44 JST: 実 Claude Code で `node dist/bin/aipanel.js followup --session <sessionId> "Reply with exactly: still ready" --json --timeout 30000` を確認

## Decision Log
- 2026-03-10 13:50 JST: compare は phase 1 の必須から外す。まず direct mode の UX を先に成立させる

## Next Action
- Closed
