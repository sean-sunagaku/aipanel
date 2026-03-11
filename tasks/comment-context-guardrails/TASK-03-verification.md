# TASK-03: Wire GitHub Actions and verification

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 15:00 JST

## Goal
- GitHub Actions でコメント契約チェックを回し、ローカル検証結果を記録する

## Parent / Depends On
- Parent: tasks/comment-context-guardrails/index.md
- Depends On: TASK-01, TASK-02

## Done When
- GitHub Actions の workflow が追加または更新されている
- 実行した検証結果がこの task に記録されている
- 残課題があれば明記されている

## Checklist
- [x] workflow を作成または更新する
- [x] `lint` / `check:docs` / `check:usage` / `typecheck` / 対象 test を実行する
- [x] 結果と残課題を記録する

## Progress Log
- 2026-03-11 14:35 JST: Task created
- 2026-03-11 14:58 JST: `.github/workflows/source-comments.yml` を追加し、lint / docs / usage / artifact upload を接続
- 2026-03-11 15:00 JST: 主要検証を完走し、残 block は無し
- 2026-03-11 15:22 JST: コメント契約改訂後も workflow で通るよう再検証を完了

## Blockers
- None

## Verification
- 2026-03-11 14:55 JST: `npm run lint` 成功
- 2026-03-11 14:55 JST: `npm run check:docs` 成功
- 2026-03-11 14:56 JST: `npm run check:usage` 成功
- 2026-03-11 14:56 JST: `npm run docs:context` 成功
- 2026-03-11 14:55 JST: `npm run fmt:check` 成功
- 2026-03-11 14:55 JST: `npm run typecheck` 成功
- 2026-03-11 14:59 JST: `npm test` 成功
- 2026-03-11 15:20 JST: `npm run lint` 成功
- 2026-03-11 15:20 JST: `npm run check:docs` 成功
- 2026-03-11 15:20 JST: `npm run check:usage` 成功
- 2026-03-11 15:22 JST: `npm run fmt:check` / `npm run typecheck` / `npm test` 成功

## Decision Log
- 2026-03-11 14:35 JST: 既存 CI とは別にコメント品質専用 workflow を追加する方針で進める

## Next Action
- Done
