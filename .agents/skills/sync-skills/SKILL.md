---
name: sync-skills
description: Sync skills from `.agents/skills/` (repo, source of truth) to `~/.claude/skills/` (global). Use when a skill was created or updated in the repo, when the user says "sync skills", "update skills", "スキルを同期", or after any edit to files under `.agents/skills/`. Also use proactively after editing a SKILL.md or reference file in `.agents/skills/`.
---

# Sync Skills

## Overview

`.agents/skills/` はこのリポジトリの Skills の正（source of truth）。
`~/.claude/skills/` はグローバルコピーで、Claude Code がどのディレクトリからでも参照できるようにするためのもの。

このスキルは `.agents/skills/` の変更を `~/.claude/skills/` に同期する。

## Workflow

1. `.agents/skills/` 配下の全スキルディレクトリを列挙する
2. 各スキルについて:
   - `~/.claude/skills/<name>/` が存在しなければディレクトリごとコピー
   - 存在すれば、`.agents/skills/<name>/` 内の全ファイルを `~/.claude/skills/<name>/` に上書きコピー
3. `~/.claude/skills/` に存在するが `.agents/skills/` にないスキルは**触らない**（他プロジェクトのスキルかもしれない）
4. 同期結果をユーザーに報告する

## Execution

以下のコマンドで同期する:

```bash
# 全スキルを同期
rsync -av --delete .agents/skills/ ~/.claude/skills/ --filter='+ */' --filter='- .git'
```

ただし `~/.claude/skills/` には他プロジェクトのスキルもある可能性があるため、
**スキル単位で同期する**のが安全:

```bash
# スキルごとに同期（他プロジェクトのスキルを消さない）
for skill_dir in .agents/skills/*/; do
  skill_name=$(basename "$skill_dir")
  mkdir -p ~/.claude/skills/"$skill_name"
  rsync -av --delete "$skill_dir" ~/.claude/skills/"$skill_name"/
done
```

## When to Run

- `.agents/skills/` 配下のファイルを編集・追加・削除した後
- 新しいスキルを作成した後
- ユーザーが「スキル同期して」「sync skills」と言った時

## Validation

同期後に以下を確認する:

```bash
# 同期結果を確認
diff -rq .agents/skills/ ~/.claude/skills/ 2>/dev/null | grep -v "Only in /Users"
```

差分がなければ同期成功。`Only in /Users/.../skills/` の行は他プロジェクトのスキルなので無視してよい。
