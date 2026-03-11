# TASK-02: Backfill src comments

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 15:00 JST

## Goal
- `src/` の既存 class / function / method に、日本語コメント契約を満たす説明を追加する

## Parent / Depends On
- Parent: tasks/comment-context-guardrails/index.md
- Depends On: TASK-01

## Done When
- 対象宣言に日本語コメントが付いている
- risky なロジックに 2 段落の JSDoc が入り、目的や設計上の意味が直接書かれている
- `lint` / `check:docs` が通る

## Checklist
- [x] 高優先ファイルへコメントを追記する
- [x] domain / repository / usecase / provider にコメントを追記する
- [x] 補助関数と private method にコメントを追記する

## Progress Log
- 2026-03-11 14:35 JST: Task created
- 2026-03-11 14:46 JST: `scripts/lint/add-source-comments.mjs` を使って `src/` 既存宣言の日本語コメントをバックフィル済み状態へ揃えた
- 2026-03-11 14:54 JST: `ContextCollector#readEntries`、`ConsultUseCase` の private helper 群、`DebugUseCase#toContextBundleProps` を個別補強
- 2026-03-11 14:58 JST: `ProviderAdapter` の interface 契約にも日本語コメントを追記
- 2026-03-11 15:18 JST: `--rewrite-existing` で既存コメントを 2 段落 JSDoc へ一括変換し、`@param` を補完

## Blockers
- None

## Verification
- 2026-03-11 14:55 JST: `npm run lint` 成功
- 2026-03-11 14:55 JST: `npm run check:docs` 成功
- 2026-03-11 15:20 JST: `npm run lint` 成功
- 2026-03-11 15:20 JST: `npm run check:docs` 成功

## Decision Log
- 2026-03-11 14:35 JST: class / function / method を優先し、constructor は class コメントで意図が十分なら個別必須にはしない
- 2026-03-11 15:18 JST: 既存コメントはラベル付き説明から、Hover で読みやすい JSDoc 2 段落構成へ寄せる

## Next Action
- Done
