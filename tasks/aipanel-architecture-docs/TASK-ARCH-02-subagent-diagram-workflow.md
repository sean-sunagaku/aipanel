# TASK-ARCH-02: Replace static generator with sub-agent workflow

## Status
- Status: done
- Owner: main + drawio-diagrammer
- Last Updated: 2026-03-10 17:05 JST

## Goal
- hardcoded な `generate-current-implementation-diagrams.mjs` を canonical path から外し、Codex sub-agent が diagram bundle JSON spec を作り、renderer が draw.io / SVG / companion Markdown を生成する流れへ置き換える。
- その手順と template を repo-local Skill と `docs/skills/` 配下へ残す。

## Parent / Depends On
- Parent: `tasks/aipanel-architecture-docs/index.md`
- Depends On: `tasks/aipanel-architecture-docs/TASK-ARCH-01-current-implementation-diagrams.md`

## Done When
- draw.io 専用 sub-agent 定義ファイルが存在する。
- diagram bundle spec JSON が `docs/rearchitecture/.../source` に存在する。
- generic renderer が spec JSON から `.drawio` / `.svg` / Markdown を再生成できる。
- Skill と docs が `sub-agent -> spec -> renderer` の流れを説明している。

## Checklist
- [x] draw.io 専用 sub-agent 定義ファイルを追加する
- [x] diagram bundle template と prompt template を docs に追加する
- [x] generic renderer を実装する
- [x] current implementation 用 spec JSON を `docs` 配下へ置く
- [x] renderer で diagrams を再生成する
- [x] SVG を検証する
- [x] 旧 static generator を canonical path から外す

## Progress Log
- 2026-03-10 16:50 JST: user 要望に合わせて Claude CLI ではなく Codex sub-agent ベースへ方針変更。
- 2026-03-10 16:54 JST: `docs/skills/aipanel-diagrams` に sub-agent workflow / template docs を追加。
- 2026-03-10 16:58 JST: `docs/skills/aipanel-diagrams/subagents/drawio-diagrammer.yaml` を追加。
- 2026-03-10 17:01 JST: `scripts/architecture/render-diagram-bundle.mjs` を実装。
- 2026-03-10 17:03 JST: `current-implementation-diagrams.spec.json` を `docs/rearchitecture/.../source` に追加し、renderer で diagrams を再生成。
- 2026-03-10 17:04 JST: `xmllint` と file inventory を通過。旧 `generate-current-implementation-diagrams.mjs` を削除。

## Blockers
- None

## Verification
- 2026-03-10 16:59 JST: `node scripts/architecture/render-diagram-bundle.mjs docs/skills/aipanel-diagrams/04_diagram-bundle-template.json <tmpdir>`
- 2026-03-10 17:03 JST: `node scripts/architecture/render-diagram-bundle.mjs docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams`
- 2026-03-10 17:03 JST: `xmllint --noout docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/*.svg`
- 2026-03-10 17:03 JST: `find docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams -maxdepth 3 -type f | sort`

## Decision Log
- 2026-03-10 16:50 JST: diagram の意味生成は Codex sub-agent、draw.io / SVG 化は deterministic renderer が担当する。
- 2026-03-10 16:56 JST: generated docs と templates は `docs/` 配下、invokable Skill 本体は `skills/` 配下に置く。
- 2026-03-10 17:02 JST: current implementation 用の canonical spec JSON も `source/` 配下に保存し、artifact と source of truth を一致させる。

## Next Action
- 次に図を更新するときは `.agent/skills/aipanel-diagrams/SKILL.md` と `docs/skills/aipanel-diagrams/subagents/drawio-diagrammer.yaml` を入口にして sub-agent へ spec を作らせる。
