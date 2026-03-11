# Comment Context Guardrails

## Status Summary
- Overall: done
- Goal: `src/` 配下で日本語コメント契約と使用状況検査を導入し、AI と人が文脈不足で必要コードを dead code 扱いしないようにする
- Last Updated: 2026-03-11 15:00 JST

## Execution Order
1. TASK-01 ガードレール実装
2. TASK-02 既存コメント追記
3. TASK-03 GitHub Actions と検証

## Tracker
| ID | Title | Status | Owner | Depends On | File | Notes |
|---|---|---|---|---|---|---|
| TASK-01 | Add comment and usage guardrails | done | main | - | tasks/comment-context-guardrails/TASK-01-guardrails.md | `scripts/lint/` と npm scripts を整備 |
| TASK-02 | Backfill src comments | done | main | TASK-01 | tasks/comment-context-guardrails/TASK-02-comment-backfill.md | `src/` の宣言へ日本語コメントを追記 |
| TASK-03 | Wire GitHub Actions and verification | done | main | TASK-01, TASK-02 | tasks/comment-context-guardrails/TASK-03-verification.md | workflow 作成と lint / docs / usage / test を確認 |

## Active Blockers
- None

## Ready Queue
- None

## Done Log
- 2026-03-11 14:35 JST: Tracker created
- 2026-03-11 14:44 JST: TASK-01 guardrails implementation completed
- 2026-03-11 14:53 JST: TASK-02 comment backfill completed
- 2026-03-11 15:00 JST: TASK-03 workflow and verification completed
- 2026-03-11 15:22 JST: コメント契約を「2 段落 JSDoc + @param」へ改訂し、複雑分岐レビュー用 prompt を追加
