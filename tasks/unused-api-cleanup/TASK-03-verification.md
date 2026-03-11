# TASK-03: Verification and wrap-up

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 11:20 JST

## Goal
- 削除後の typecheck / test / package verification を完了し、残課題を整理する

## Parent / Depends On
- Parent: tasks/unused-api-cleanup/index.md
- Depends On: TASK-02

## Done When
- 必須検証が完了している
- 失敗したものがあれば原因と残課題が記録されている

## Checklist
- [x] typecheck を実行する
- [x] test を実行する
- [x] pack dry-run を実行する
- [x] 結果を台帳に反映する

## Progress Log
- 2026-03-11 10:53 JST: Task created
- 2026-03-11 10:53 JST: `npm run typecheck` が成功
- 2026-03-11 10:53 JST: `npm test` が成功
- 2026-03-11 10:53 JST: `npm run pack:dry-run` が成功
- 2026-03-11 11:20 JST: 追加削除後も `npm run typecheck` が成功
- 2026-03-11 11:20 JST: 追加削除後も `npm test` が成功
- 2026-03-11 11:20 JST: 追加削除後も `npm run pack:dry-run` が成功
- 2026-03-11 11:34 JST: barrel 削除と CLI-only 化の後に `npm run typecheck` が成功
- 2026-03-11 11:34 JST: barrel 削除と CLI-only 化の後に `npm test` が成功
- 2026-03-11 11:34 JST: barrel 削除と CLI-only 化の後に `npm run lint` と `npm run verify:package` が成功
- 2026-03-11 11:32 JST: CLI-only 化と barrel 削除後も `npm run lint` が成功
- 2026-03-11 11:32 JST: CLI-only 化と barrel 削除後も `npm test` が成功
- 2026-03-11 11:32 JST: CLI-only 化と barrel 削除後も `npm run verify:package` が成功
- 2026-03-11 11:32 JST: `npx ts-prune -p tsconfig.json` が空になった
- 2026-03-11 11:33 JST: public surface 追加整理後も `npm run typecheck` が成功
- 2026-03-11 11:33 JST: public surface 追加整理後も `npm test` が成功
- 2026-03-11 11:33 JST: public surface 追加整理後も `npm run verify:package` が成功

## Blockers
- None

## Verification
- 2026-03-11 10:53 JST: typecheck pass
- 2026-03-11 10:53 JST: unit/integration/e2e test pass
- 2026-03-11 10:53 JST: pack dry-run pass
- 2026-03-11 11:20 JST: second-pass typecheck pass
- 2026-03-11 11:20 JST: second-pass unit/integration/e2e test pass
- 2026-03-11 11:20 JST: second-pass pack dry-run pass
- 2026-03-11 11:34 JST: third-pass typecheck pass
- 2026-03-11 11:34 JST: third-pass unit/integration/e2e test pass
- 2026-03-11 11:34 JST: third-pass lint pass
- 2026-03-11 11:34 JST: third-pass verify-package pass
- 2026-03-11 11:32 JST: lint pass
- 2026-03-11 11:32 JST: final unit/integration/e2e test pass
- 2026-03-11 11:32 JST: packaged CLI install verification pass
- 2026-03-11 11:32 JST: ts-prune empty
- 2026-03-11 11:33 JST: third-pass typecheck pass
- 2026-03-11 11:33 JST: third-pass unit/integration/e2e test pass
- 2026-03-11 11:33 JST: third-pass verify:package pass

## Decision Log
- 2026-03-11 10:53 JST: 追従漏れは typecheck/test/pack で検出されず、追加修正は不要と判断
- 2026-03-11 11:20 JST: dead field と public surface の追加削除後も回帰なし
- 2026-03-11 11:34 JST: `ts-prune` が空になり、repo 内未使用 export は解消したと判断
- 2026-03-11 11:32 JST: CLI-only 前提で未使用 export / barrel / dead type を刈り切った
- 2026-03-11 11:33 JST: package export の縮小後も tarball install と root/domain import が成立した

## Next Action
- Cleanup complete
