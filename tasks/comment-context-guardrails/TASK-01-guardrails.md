# TASK-01: Add comment and usage guardrails

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 15:00 JST

## Goal
- `src/` の class / function / method に日本語コメント契約を強制し、使用状況を自動検査できる仕組みを追加する

## Parent / Depends On
- Parent: tasks/comment-context-guardrails/index.md
- Depends On: none

## Done When
- `lint` でコメント契約の最低限を検査できる
- `check:docs` と `check:usage` が追加されている
- コメントルールの運用文書が存在する

## Checklist
- [x] ESLint のコメント契約ルールを追加する
- [x] `check:docs` スクリプトを追加する
- [x] `check:usage` スクリプトを追加する
- [x] 運用文書を追加する

## Progress Log
- 2026-03-11 14:35 JST: Task created
- 2026-03-11 14:49 JST: `scripts/lint/` 配下へ lint 関連スクリプトを集約し、`eslint` 連携・`check:docs`・`check:usage` の導線を整備中
- 2026-03-11 14:57 JST: `source-comment-contract` ルールで class / function / method / private method を検査する構成を確定
- 2026-03-11 14:58 JST: `check:docs` と `check:usage` を package scripts へ接続し、`reports/symbol-context.json` を生成する導線を確定
- 2026-03-11 14:59 JST: `docs/source-comment-contract.md` と `source-comments` workflow を整備
- 2026-03-11 15:21 JST: コメント契約を「何をするか + 目的を直接書く 2 段落 JSDoc」に改訂し、`@param` の必須検査を追加
- 2026-03-11 15:22 JST: `rationaleSignalCount` と `needsPurposeReview` を `symbol-context` レポートへ追加し、SubAgent 用 prompt を作成

## Blockers
- None

## Verification
- 2026-03-11 14:55 JST: `npm run check:docs` 成功
- 2026-03-11 14:56 JST: `npm run check:usage` 成功
- 2026-03-11 15:20 JST: `npm run check:docs` 成功
- 2026-03-11 15:20 JST: `npm run check:usage` 成功

## Decision Log
- 2026-03-11 14:35 JST: コメント本文は基本日本語で統一する
- 2026-03-11 14:35 JST: private method もコメント必須対象に含める
- 2026-03-11 14:35 JST: 呼び出し元情報はコメント本文より自動検査レポートを優先する
- 2026-03-11 15:21 JST: `なぜ:` / `削除注意:` ラベルは採用せず、Hover とドキュメント出力を優先した 2 段落 JSDoc に統一する
- 2026-03-11 15:21 JST: 引数付き宣言は `@param` を必須にし、CI で形式を検査する

## Next Action
- Done
