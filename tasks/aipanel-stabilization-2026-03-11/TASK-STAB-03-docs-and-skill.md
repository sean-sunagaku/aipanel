# TASK-STAB-03: Improve Source Docs Intent and Docs Review Workflow

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 14:39 JST

## Goal
- `src/domain` で「なぜ存在するか / なんの役割か」が伝わる説明へ寄せる。
- 今後の Docs 追記を review / repair しやすい repo-local workflow か Skill を追加する。

## Parent / Depends On
- Parent: `tasks/aipanel-stabilization-2026-03-11/index.md`
- Depends On: `TASK-STAB-01`

## Done When
- `src/domain` の主要ファイル・宣言説明が存在理由と役割を読める形へ改善されている。
- source comment contract や補助導線が、その観点を落としにくい形に更新されている。
- 必要な repo-private Skill / docs / Makefile 導線が整っている。

## Checklist
- [x] `src/domain` の説明方針を決める
- [x] comment contract / lint / workflow の必要差分を入れる
- [x] review / repair 用の repo-private Skill かローカル導線を追加する

## Progress Log
- 2026-03-11 14:27 JST: Task created from user feedback that current comments explain normalization mechanics but not existence and role.
- 2026-03-11 14:34 JST: `src/**/*.ts` に file header を追加し、class コメントを「この repo で何の責務を持つか」へ寄せて rewrite。
- 2026-03-11 14:36 JST: `docs/source-comment-contract.md` を更新し、fixed phrase ではなくコード文脈から目的を書く方針を明文化。
- 2026-03-11 14:36 JST: `check-doc-comments.mjs` / `comment-contract.mjs` に file overview validation と generic class 文言の検査を追加。
- 2026-03-11 14:36 JST: `.agents/skills/source-docs-review/` と `make ai-docs-review` を追加し、docs review / repair 導線を整備。
- 2026-03-11 14:37 JST: `.agents/skills/` を `~/.claude/skills/` へ同期済み。

## Blockers
- None

## Verification
- 2026-03-11 14:35 JST
  - Type: automated test
  - Scope: source comment contract
  - Command: `pnpm run check:docs`
  - Result: pass
  - Notes: 181 declarations を確認し、file overview を含む docs 契約違反は 0 件
- 2026-03-11 14:36 JST
  - Type: automated test
  - Scope: symbol context generation
  - Command: `pnpm run docs:context`
  - Result: pass
  - Notes: `reports/symbol-context.json` を再生成
- 2026-03-11 14:36 JST
  - Type: automated test
  - Scope: repo-private skill validation
  - Command: `pnpm run check:agent-skills`
  - Result: pass
  - Notes: 新規 `source-docs-review` 追加後も skill 構成は valid

## Decision Log
- 2026-03-11 14:27 JST: `src/domain` では「変換規則」より先に「存在理由・責務境界」を書く方向へ寄せる。

## Next Action
- Closed
