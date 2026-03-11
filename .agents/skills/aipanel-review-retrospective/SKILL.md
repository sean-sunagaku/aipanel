---
name: aipanel-review-retrospective
description: Review recent `aipanel` work, extract what should have been caught earlier, and write or update a reusable retrospective note under `docs/usage-review/`. Use when the user asks for retrospective notes, review learnings, "もっとこうしたらよかった", implementation watchouts, or a review-focused agent that turns recent diffs, task notes, and tests into durable guidance.
---

# Aipanel Review Retrospective

## Overview

`aipanel` の実装やレビューのあとに、後追いで見つかった改善点を `docs/usage-review/` に定着させるための Skill。
感想を並べるのではなく、コード、テスト、docs、Skill の drift まで根拠付きで振り返る。

## Workflow

1. 振り返る対象を決める。
   - ユーザー指定の feature / task / command を優先する。
   - 指定が弱ければ、変更ファイル、`tasks/**/index.md`、直近の review findings から対象を絞る。
   - 出力先は `docs/usage-review/<topic>_YYYY-MM-DD.md` を基本にする。
2. 先に証拠を集める。
   - `git status --short`、関連 diff、task note、README / Skill 変更、関連テストを読む。
   - CLI / persistence / artifact / Makefile / Skill まで触る変更では [references/review-checklist.md](references/review-checklist.md) を読む。
3. 現在の状態を検証する。
   - まず対象に近い unit / integration / e2e を実行し、必要なら repo 全体の検証へ広げる。
   - `.agents/skills/` を編集したら、最後に `pnpm run check:agent-skills` と skill sync を必ず入れる。
4. retrospective note を書く。
   - [references/note-template.md](references/note-template.md) を土台にする。
   - `Confirmed Good Changes` と `What We Should Have Caught Earlier` を分ける。
   - 各指摘は、コード、テスト、実 CLI 利用、または task note のどれかに紐づける。
5. 再利用すべき学びは repo に戻す。
   - 今後の作業に効くものは、関連 Skill / docs / checklist も同じ pass で直す。
6. 仕上げる。
   - 実行した検証をもう一度まとめる。
   - `.agents/skills/` を触った場合は `~/.claude/skills/` に同期して終える。

## Default Review Lenses

- session continuity:
  `sessionId` を返す command なら、後続 `followup` が元コンテキストを本当に再利用できるかを見る。
- artifact observability:
  外部入力や source document を保存するなら、run ledger から artifact ID / path を辿れるかを見る。
- CLI contract drift:
  新 flag や command-specific option を足したら、誤った command で拒否されるかも確認する。
- output contract:
  text / JSON、summary / details、verdict 抽出、exit code の整合を分けて確認する。
- docs and skills drift:
  README、Makefile helper、git hook、private/public Skill が旧仕様のまま残っていないかを見る。
- fake provider realism:
  prompt や transcript 形が変わったら、fake provider も同じ形を読めるようにする。

## Output Expectations

- `docs/usage-review/` に 1 つの note を新規作成または更新する。
- note には最低限 `Context`, `Confirmed Good Changes`, `What We Should Have Caught Earlier`, `Next-Time Checklist`, `Evidence` を含める。
- 感想より heuristic を残す。次回の実装 / review で再利用できる形にする。

## Resource Map

- Use [references/review-checklist.md](references/review-checklist.md) when the change touches CLI surfaces, persistence, artifacts, or workflow helpers.
- Use [references/note-template.md](references/note-template.md) when creating or updating the actual `docs/usage-review/*.md` note.
