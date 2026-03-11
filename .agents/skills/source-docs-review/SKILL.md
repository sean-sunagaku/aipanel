---
name: source-docs-review
description: Review and repair source-level docs for `aipanel`, especially `src/**/*.ts` file headers and JSDoc comments that should explain why a file or symbol exists in this repository and what responsibility it owns. Use when asked to add or improve source docs, clarify `src/domain` or other `src/` responsibilities, rewrite generic comments into repo-specific ones, or run a docs-focused review on staged changes.
---

# Source Docs Review

## Overview

`src/**/*.ts` の docs は、固定文を貼るのではなく、その file / symbol が `aipanel` の中で何のために存在するかをコードから読んで書く。

特に見ること:

- この file は何を定義しているか
- なぜ独立した file / class / function として存在するか
- どの責務を持ち、どの責務を隣の層へ漏らさないようにしているか

## Workflow

1. 対象 file と、その近い import 先 / 呼び出し元を必要な範囲で読む。
2. [docs/source-comment-contract.md](../../../docs/source-comment-contract.md) を読み、file header と JSDoc の契約を確認する。
3. `src/` 配下では file 先頭 overview を先に整える。
4. class / function / method の JSDoc は、generic な「責務を一箇所にまとめる」を避け、現在のコードから読める repo 文脈へ書き換える。
5. 迷う宣言は [scripts/lint/comment-rationale-reviewer.md](../../../scripts/lint/comment-rationale-reviewer.md) の観点で見直す。
6. 変更後は `pnpm run check:docs` を実行する。
7. 複雑な差分や staged diff 全体を見たいときは `make ai-docs-review` を使う。

## Guidance

- `src/domain`: `session`, `run`, `artifact` のどの正本責務を持つかを書く。
- `src/usecases`: command 実行手順と状態更新順をなぜここへ置くかを書く。
- `src/providers`: 外部 CLI 差分をどう境界で吸収しているかを書く。
- `src/run` / `src/session` / `src/artifact`: repository / coordinator / manager の責務分離を書く。
- `src/shared`: 小さな helper でも「なぜ shared に置くのか」を短く書く。
- コードから断定できない意図は書かない。
- script で生成された文面を見つけたら、そのまま accept せず現在の実装に合わせて言い換える。
