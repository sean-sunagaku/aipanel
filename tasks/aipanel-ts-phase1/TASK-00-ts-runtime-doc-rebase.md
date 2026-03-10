# TASK-00: Rebase canonical docs to TS runtime

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-10 13:50 JST

## Goal
- 正式アーキテクチャと実装計画を Go 前提から TypeScript / Node.js 前提へ切り替える

## Parent / Depends On
- Parent: `tasks/aipanel-ts-phase1/index.md`
- Dependencies: None

## Done When
- README が TS runtime 前提を示している
- Formal Architecture と Implementation Plan が TypeScript / Node.js 前提になっている
- 主要 package / module 構成が `src/cli/aipanel.ts`, `src/...`, `tsconfig.json` に揃っている

## Checklist
- [x] README の runtime / capability 表現を TS 前提へ更新
- [x] Formal Architecture の entrypoint と module boundary を TS 前提へ更新
- [x] Recommended Architecture と CLI Broker 案の構成例を TS 前提へ更新
- [x] Implementation Plan の言語前提と検証コマンドを TS 前提へ更新

## Progress Log
- 2026-03-10 13:35 JST: タスク作成前に TypeScript 指定へ寄せる前段として、必要な canonical docs を洗い出した
- 2026-03-10 13:50 JST: 主要 docs を TypeScript / Node.js 前提へ更新し、task ledger 作成の前提を整えた

## Blockers
- None

## Verification
- 2026-03-10 13:48 JST
  - Type: manual check
  - Scope: docs runtime alignment
  - Method: `rg` で `cmd/aipanel`, `internal/`, `Go`, `go build`, `go test` を検索し、canonical docs の更新箇所を確認
  - Result: pass
  - Notes: 主要な canonical docs は TS 側へ寄せた。旧比較 docs の一部は generic な文言が残るが、正式 docs の読み筋は統一済み
- 2026-03-10 13:32 JST
  - Type: manual check
  - Scope: local runtime evidence
  - Command: `which node && node -v`
  - Result: pass
  - Notes: `node v25.3.0` を確認

## Decision Log
- 2026-03-10 13:32 JST: 実装言語は TypeScript / Node.js を優先する。ユーザー指定が最優先であり、ローカルに Node が存在する
- 2026-03-10 13:40 JST: Canonical docs の整合を先に取ってから task system を作る。理由は task 内容の前提が変わるため

## Next Action
- `TASK-01` で Claude Code CLI 契約を実測し、resume / output 方式を固定する
