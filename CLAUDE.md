# CLAUDE.md

## Project

`aipanel-cli` — Claude Code と Codex をプロバイダーとして使える CLI ブローカー / オーケストレーター。

- Package name: `aipanel-cli`
- Runtime: Node.js ≥ 20, TypeScript, ESM
- Package manager: pnpm (`corepack enable` → `pnpm install`)

## Quick Commands

```bash
pnpm run build          # ビルド
pnpm run dev ARGS       # tsx で直接実行
pnpm start ARGS         # ビルド済み dist で実行
pnpm test               # unit + integration + e2e
pnpm run typecheck      # 型チェック
pnpm run lint           # ESLint
pnpm run fmt:check      # Prettier チェック
```

## Skills の管理

Skills は **リポジトリ内 `.agents/skills/` が正（source of truth）**。

```
.agents/skills/
  use-aipanel-cli/      ← aipanel の使い方ガイド
  aipanel-diagrams/     ← アーキテクチャ図生成
  unused-symbol-pruning/ ← 未使用シンボル削除
```

- Skills を更新するときは `.agents/skills/` を編集する。`~/.claude/skills/` は同期コピー。
- `.agents/skills/` を変更したら `/sync-skills` で `~/.claude/skills/` に同期する。
- 新しい Skill を追加する場合も `.agents/skills/<name>/SKILL.md` に作成してから `/sync-skills` で同期。

## aipanel セルフレビュー

このプロジェクトでは aipanel 自体を開発ワークフローに組み込んでいる。

### Makefile targets

```bash
make ai-review              # staged diff を Codex にレビューさせる
make ai-review-deep         # ブランチ全体を debug (3段分析) でレビュー
make ai-docs-review         # staged diff の source docs / JSDoc をレビュー
make ai-plan FILE=plan.md   # Plan ファイルを添削させる
make ai-followup SESSION=session_xxx QUESTION="..."  # セッション継続
make hooks-install          # git hooks を有効化
```

- デフォルト: `AI_PROVIDER=codex`, `AI_TIMEOUT=600000`（10分）
- 上書き: `make ai-review AI_PROVIDER=claude-code`
- `make ai-docs-review` は `src/` 配下の file header / JSDoc が「この repo でなぜ存在するか」「何の責務を持つか」を伝えられているかを重点的に見る

### Git hooks (`.githooks/`)

`make hooks-install` で有効化。

- `pre-commit`: staged diff を `consult` で軽量レビュー (non-blocking)
- `pre-push`: ブランチ全体を `debug` で深いレビュー (non-blocking)

### Verdict protocol

レビュー結果の先頭行に判定を出力させる:

- `REVIEW_VERDICT: pass|warn|block` — コードレビュー
- `PLAN_VERDICT: good|revise` — Plan 添削

### Timeout

Codex provider は起動が遅いため `--timeout 300000`（5分）以上を推奨。`120000` だとタイムアウトしやすい。

## コーディング規約

- 日本語コメント可。JSDoc の `@remarks` で設計意図を書く既存スタイルに従う。
- `source comment contract` ガードレールあり（`pnpm run check:docs`）。
- comment は固定文より repo 文脈を優先する。対象 file の実装と周辺コードから、その時点の目的を言語化する。
- 未使用 export は `pnpm run check:usage` で検出。
