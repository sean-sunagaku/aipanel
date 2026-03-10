# TASK-ARCH-01: Generate current implementation diagrams

## Status
- Status: done
- Owner: main + architecture-reviewer
- Last Updated: 2026-03-10 16:39 JST

## Goal
- 現行 TypeScript 実装を正として、全体アーキテクチャ図、実行データフロー図、クラス図、永続化 / データ構成図を `draw.io` source と `SVG` で生成する。
- 図と対応する Markdown 説明を `docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams` に追加し、README と正式アーキテクチャ文書から辿れるようにする。

## Parent / Depends On
- Parent: `tasks/aipanel-architecture-docs/index.md`
- Depends On: `tasks/aipanel-ts-phase1/index.md`

## Done When
- `12_current-implementation-diagrams` 配下に `.drawio`, `.svg`, `.md` が揃っている。
- 図の内容が現行実装のクラス / 永続化モデル / direct / orchestrated flow と整合している。
- `xmllint --noout` で生成 SVG の妥当性を確認している。
- README または rearchitecture docs から入口リンクが追加されている。
- 図の再生成手順をたどる repo-local Skill と docs companion が作成されている。

## Checklist
- [x] 対象となる実装ファイルと docs の境界を確認する
- [x] architecture-reviewer sub-agent に図の観点整理を依頼する
- [x] generator を修正して source / svg / md を生成できるようにする
- [x] 図を生成して妥当性確認を行う
- [x] README / rearchitecture docs へ導線を追加する
- [x] architecture diagram Skill と docs companion を追加する
- [x] 最終 verification を記録して task を close する

## Progress Log
- 2026-03-10 16:20 JST: Task 作成。既存の `scripts/architecture/generate-current-implementation-diagrams.mjs` を確認開始。
- 2026-03-10 16:21 JST: `task-orchestrator` / `rearchitecture` skill の運用ルールを再確認。
- 2026-03-10 16:22 JST: architecture-reviewer sub-agent に図の切り方と主要ノード整理を依頼。
- 2026-03-10 16:30 JST: generator を修正し、diagram set を `architecture-overview`, `direct-mode-data-flow`, `debug-orchestrated-data-flow`, `core-class-diagram`, `persistence-data-model` の 5 枚へ再構成。
- 2026-03-10 16:33 JST: `README.md`, `00_overview.md`, `10_formal-architecture.md` に diagram entrypoint を追加。`00_overview.md` の古い「未実装」前提も修正。
- 2026-03-10 16:37 JST: repo-local Skill `.agent/skills/aipanel-diagrams` と docs companion `docs/skills/aipanel-diagrams/*` を追加。
- 2026-03-10 16:38 JST: 新しい Skill docs を読み直し、手順どおりに generator 再実行と SVG 検証を完了。

## Blockers
- None

## Verification
- 2026-03-10 16:31 JST: `node scripts/architecture/generate-current-implementation-diagrams.mjs`
- 2026-03-10 16:31 JST: `xmllint --noout docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/*.svg`
- 2026-03-10 16:31 JST: `find docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams -maxdepth 3 -type f | sort`
- 2026-03-10 16:38 JST: `node scripts/architecture/generate-current-implementation-diagrams.mjs`
- 2026-03-10 16:38 JST: `xmllint --noout docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/*.svg`
- 2026-03-10 16:38 JST: `find docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams -maxdepth 3 -type f | sort`

## Decision Log
- 2026-03-10 16:20 JST: 図は外部 draw.io CLI に依存せず、repo-local generator で `.drawio` と `.svg` を同時生成する。
- 2026-03-10 16:21 JST: 今回は「実装そのものの設計図」を対象にし、phase 2 構想図は正式アーキテクチャ文書へのリンクで補う。
- 2026-03-10 16:30 JST: data flow は 1 枚に混ぜず、direct mode と debug orchestrated mode を別図に分ける。
- 2026-03-10 16:36 JST: Skill 本体は `skills/` に置き、参照ドキュメントは `docs/skills/` 配下へ置く。

## Next Action
- None. 次に図を更新するときは `.agent/skills/aipanel-diagrams/SKILL.md` と `docs/skills/aipanel-diagrams/*` を入口にする。
