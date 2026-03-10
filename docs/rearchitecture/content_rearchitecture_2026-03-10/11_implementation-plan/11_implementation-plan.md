# Implementation Plan

## Document Status
- Status: Proposed
- Last Updated: 2026-03-10
- Scope: phase 1 実装計画
- Target Architecture: `CLI Broker + Run-Centric Ledger`

## Goal
この計画は、`aipanel` を docs 上の正式アーキテクチャから実装可能な作業順へ落とし込むためのロードマップである。

目的は「とりあえず動く CLI」を作ることだけではない。  
`Session`, `Run`, `Artifact` の責務分離を壊さず、主要 domain model を entity-first DDD で固定し、Claude Code 単独 provider の phase 1 を正しく成立させ、あとから multi-agent と multi-provider を足しても作り直しにならない実装順を作ることである。

## Assumption Ledger

### Confirmed
- 正式アーキテクチャは `CLI Broker + Run-Centric Ledger`
- phase 1 の concrete provider は `Claude Code` のみ
- `Session` は会話の正本、`Run` は実行の正本、`Artifact` は重い payload の置き場
- `Session`, `Run`, `Artifact` を aggregate root にし、主要 trace object は entity として扱う
- compare は phase 2 以降の本格導入対象
- 将来の multi-agent 役割は `Run` 配下の task / role として追加する
- ローカル環境に `node` があり、`v25.3.0` を確認済み
- ローカル環境に `claude` コマンドがあり、`-p`, `-c`, `-r`, `--output-format` などの非対話向けオプションが存在することを確認済み

### Tentative
- 実装言語は TypeScript / Node.js とする
- phase 1 の永続化は `.aipanel/` 配下の JSON ファイルで始める
- phase 1 の必須 command は `consult`, `followup`, `debug`, `providers`
- `compare` command は phase 1 では hidden または no-op に近い扱いにする
- `ClaudeAdapter` はまず CLI subprocess ベースで実装する
- package 構成は `src/cli/aipanel.ts`, `src/...`, `package.json`, `tsconfig.json` を採用する

### Unresolved
- Claude Code の resume を `-c`, `-r`, `--session-id` のどれで安定運用するか
- `Session.providerRefs` に何を保存すれば十分か
- `Run`, `RunTask`, `TaskResult`, `Artifact` の最小 field set
- entity と value object の境界をどこまで細かく切るか
- `debug` の orchestrated mode をどこまで phase 1 に入れるか
- `compare` command を surface に出すか完全に隠すか

## Evidence For Major Decisions
- Decision: TypeScript / Node.js を第一候補とする  
  Evidence: ユーザーが TypeScript を指定しており、ローカルに `node v25.3.0` が存在する。
- Decision: file-based JSON persistence で始める  
  Evidence: 現状は単一ローカル CLI で、正式 docs に `.aipanel/sessions`, `.aipanel/runs`, `.aipanel/artifacts` が明記されている。
- Decision: Claude Code 単独 provider で phase 1 を切る  
  Evidence: [Formal Architecture](../10_formal-architecture/10_formal-architecture.md) で正式決定済み。
- Decision: compare を phase 2 に送る  
  Evidence: provider scope が 1 つであり、まず `consult`, `followup`, `debug` の信頼性確立が優先。

## Success Criteria
- `aipanel consult` で Claude Code に問い合わせ、結果と `Session/Run/Artifact` を保存できる
- `aipanel followup` で既存 session に続けて問い合わせできる
- `aipanel debug` でログや対象ファイルを集め、少なくとも Claude Code 単独の orchestrated flow を走らせられる
- `aipanel providers` で `claude-code` を返せる
- 失敗時も `Run` 状態と最低限の artifact 参照が残る

## Failure Modes Considered
- `Session` と `Run` の責務が混ざる
- entity と value object の境界が曖昧で TypeScript 実装時に型責務が崩れる
- Claude Code の resume 契約が docs 想定と違い、follow-up が壊れる
- `ProviderRegistry` が過剰抽象になり、Claude Code 単独実装が遅れる
- `debug` の orchestrated mode を早く入れすぎて direct mode の UX が弱くなる
- `NormalizedResponse` を重くしすぎて phase 1 で不要な設計負債を抱える

## Recommended Phase Order
1. [00_scope-and-spike](./00_scope-and-spike/00_scope-and-spike.md)
2. [01_project-foundation](./01_project-foundation/01_project-foundation.md)
3. [02_persistence-and-models](./02_persistence-and-models/02_persistence-and-models.md)
4. [03_direct-mode-commands](./03_direct-mode-commands/03_direct-mode-commands.md)
5. [04_debug-orchestrated-mode](./04_debug-orchestrated-mode/04_debug-orchestrated-mode.md)
6. [05_hardening-and-phase2-hooks](./05_hardening-and-phase2-hooks/05_hardening-and-phase2-hooks.md)

## Roadmap Summary

| Phase | Main Outcome | Why First / Why Later |
|---|---|---|
| 00 | 契約と前提を固定する | ここが曖昧だと repository 実装が全部やり直しになる |
| 01 | CLI 土台と adapter の骨格を作る | command surface を早く固定するため |
| 02 | `Session/Run/Artifact` を永続化する | 以降の command はこの正本なしに作らない |
| 03 | `consult`, `followup`, `providers` を成立させる | 最小 UX を先に成立させる |
| 04 | `debug` の orchestrated mode を入れる | multi-agent 的役割の土台をここで作る |
| 05 | hardening と phase 2 の差し込み口を整える | 比較や第二 provider を壊さず足せるようにする |

## Confidence Gate
- Confidence: Medium
- Reason:
  - アーキテクチャと責務分離は固まっている
  - 実装順もかなり明確
  - ただし Claude Code の resume 契約と最小 schema は phase 0 で必ず実測・固定が必要

## Non-Goals For This Plan
- phase 1 で multi-provider compare を完成させること
- phase 1 で daemon や MCP facade を作ること
- phase 1 で distributed worker や本格 state machine を導入すること

## Final Planning Rule
phase 0 の確認が終わるまで、repository schema と `followup` の確定実装には入らない。  
逆に phase 0 が済めば、その後の実装はこの順序で進めるのが最も安全である。
