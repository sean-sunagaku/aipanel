# TASK-02: Scaffold Node CLI foundation

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-10 14:43 JST

## Goal
- TypeScript / Node.js ベースの最小 CLI 骨格と module 境界を作る

## Parent / Depends On
- Parent: `tasks/aipanel-ts-phase1/index.md`
- Dependencies: `TASK-01`

## Done When
- `package.json`, `tsconfig.json`, `src/cli/aipanel.ts` が存在する
- `src/` 配下の主要 module 境界が作られている
- `aipanel providers` が動く最小 CLI がある

## Checklist
- [x] `package.json` を作る
- [x] `tsconfig.json` を作る
- [x] `src/cli/aipanel.ts` を作る
- [x] `src/app`, `src/usecases`, `src/providers`, `src/output` を作る
- [x] `CommandRouter` と `WorkflowSelector` の最小版を入れる
- [x] `ProviderRegistry` と `ProviderAdapter` interface 相当を定義する
- [x] `providers` command の最小動作を作る

## Progress Log
- 2026-03-10 13:50 JST: タスク作成
- 2026-03-10 14:00 JST: `TASK-01` 完了を受けて着手。`claude-code` adapter は JSON `subtype` 判定と `ProviderRef` 補助保存前提で進める
- 2026-03-10 14:06 JST: multi-agent 実装へ切り替え。worker 1 に `package.json`, `src/cli`, `src/app`, `src/providers`, `src/output` を担当させ、main は統合を担当する
- 2026-03-10 14:43 JST: `bin/aipanel.ts` と `src/cli/aipanel.ts` の entrypoint を統合し、`dist/bin/aipanel.js` が build 後の canonical executable になるように修正
- 2026-03-10 14:43 JST: `providers` command の text / JSON 出力と CLI help を確認

## Blockers
- `TASK-01` が未完了だと adapter の I/O 契約が曖昧なままになる

## Verification
- 2026-03-10 14:18 JST: `npm run build` 成功
- 2026-03-10 14:21 JST: `node /Users/babashunsuke/Repository/aipanel/dist/bin/aipanel.js providers` が `claude-code` を返すことを確認
- 2026-03-10 14:21 JST: `node /Users/babashunsuke/Repository/aipanel/dist/bin/aipanel.js providers --json` が JSON 形式で `claude-code` を返すことを確認
- 2026-03-10 14:44 JST: `npm test` 内の `test/integration/cli.test.ts` と `test/e2e/cli.e2e.test.ts` が pass

## Decision Log
- 2026-03-10 13:50 JST: まずは built-in test runner を念頭に置いたが、TypeScript source をそのまま安定実行するため phase 1 は `tsx --test` を採用した

## Next Action
- Closed
