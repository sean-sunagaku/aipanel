# Unused API Cleanup

## Status Summary
- Overall: done
- Goal: repo 全体の未使用メソッド・関数・公開 API を監査し、実際に未使用なものを削除して検証まで完了する
- Last Updated: 2026-03-11 11:20 JST

## Execution Order
1. TASK-01 候補監査
2. TASK-02 削除実装
3. TASK-03 検証と残課題整理

## Tracker
| ID | Title | Status | Owner | Depends On | File | Notes |
|---|---|---|---|---|---|---|
| TASK-01 | Unused API audit | done | main | - | tasks/unused-api-cleanup/TASK-01-audit.md | 高信頼候補を確定済み |
| TASK-02 | Remove unused APIs | done | main | TASK-01 | tasks/unused-api-cleanup/TASK-02-implementation.md | export / README / tests 追従込み |
| TASK-03 | Verification and wrap-up | done | main | TASK-02 | tasks/unused-api-cleanup/TASK-03-verification.md | typecheck / test / pack |

## Active Blockers
- None

## Ready Queue
- None

## Done Log
- 2026-03-11 10:53 JST: Tracker created
- 2026-03-11 10:53 JST: TASK-01 audit completed
- 2026-03-11 10:53 JST: TASK-02 implementation completed
- 2026-03-11 10:53 JST: TASK-03 verification completed
- 2026-03-11 11:20 JST: second-pass dead field / public surface cleanup completed
- 2026-03-11 11:34 JST: third-pass barrel removal / CLI-only cleanup completed
- 2026-03-11 11:32 JST: CLI-only package surface cleanup と barrel 削除を完了
- 2026-03-11 11:33 JST: third-pass package surface cleanup completed
