# TASK-STAB-02: Consolidate Test Helpers and Fix Broken Tests

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 14:39 JST

## Goal
- test の重複を減らしつつ、途中変更で壊れた parsing / sandbox / payload assertion を収束させる。

## Parent / Depends On
- Parent: `tasks/aipanel-stabilization-2026-03-11/index.md`
- Depends On: `TASK-STAB-01`

## Done When
- 共通 helper が過不足なく使われ、test 側の重複が減っている。
- `test:unit` / `test:integration` / `test:e2e` で主要 failure が消えている。

## Checklist
- [x] `test/support` の helper 追加差分を確認する
- [x] integration / e2e / unit test の壊れた参照や typo を修正する
- [x] 共通化しすぎで読みにくくなった箇所があれば戻してバランスを取る

## Progress Log
- 2026-03-11 14:27 JST: Task created to track test helper consolidation and repair of partial edits from the interrupted turn.
- 2026-03-11 14:31 JST: `test/support/cliPayloads.ts` を `literalTuple` 利用へ寄せ、literal 型を崩さず payload parse helper を維持。
- 2026-03-11 14:37 JST: `pnpm test` を完走し、unit / integration / e2e の全テストが pass。

## Blockers
- None

## Verification
- 2026-03-11 14:37 JST
  - Type: automated test
  - Scope: full test suite
  - Command: `pnpm test`
  - Result: pass
  - Notes: unit 10件 / integration 2件 / e2e 3件がすべて通過

## Decision Log
- 2026-03-11 14:27 JST: Helper extraction is allowed only when it keeps assertions explicit; opaque test DSL 化は避ける。

## Next Action
- Closed
