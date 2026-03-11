# TASK-03: Implement persistence models

## Historical Note
このタスク記録にある `ContextBundle`, `ProviderRef`, `ExternalRef` は 2026-03-11 の cleanup で整理済み。現在は `RunContext` を使い、provider native session tracking は保持しない。

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-10 14:43 JST

## Goal
- `Session`, `Run`, `Artifact` aggregate と関連 entity / value object の JSON schema と repository を固める

## Parent / Depends On
- Parent: `tasks/aipanel-ts-phase1/index.md`
- Dependencies: `TASK-01`, `TASK-02`

## Done When
- `.aipanel/sessions`, `.aipanel/runs`, `.aipanel/artifacts` の layout が実装されている
- `SessionRepository`, `RunRepository`, `ArtifactRepository` が round-trip できる
- partial failure でも `Run.status` が保存される
- entity と value object の境界が docs と実装で一致している

## Checklist
- [x] schema version field を入れる
- [x] `Session` aggregate root と `SessionTurn` entity の JSON schema を定義する
- [x] `Run` aggregate root と `RunTask`, `TaskResult` entity の JSON schema を定義する
- [x] `ContextBundle`, `ProviderResponse`, `NormalizedResponse`, `ComparisonReport` entity の JSON schema を定義する
- [x] `Artifact` aggregate root の JSON schema を定義する
- [x] 当時必要だった value object を定義する
- [x] file-based repository を実装する
- [x] round-trip test を追加する

## Progress Log
- 2026-03-10 13:50 JST: タスク作成
- 2026-03-10 13:59 JST: canonical docs が entity-first DDD 方針へ更新されたため、schema 設計タスクも aggregate / entity / value object の切り分け前提へ更新
- 2026-03-10 14:06 JST: multi-agent 実装へ切り替え。worker 2 に `src/domain`, `src/session`, `src/run`, `src/artifact` の entity / repository 実装を担当させ、main は use case との統合を担当する
- 2026-03-10 14:43 JST: `exactOptionalPropertyTypes` を満たすよう create / repository 経路を修正し、JSON persistence の round-trip を安定化
- 2026-03-10 14:43 JST: `Session`, `Run`, `Artifact` 実ファイルを `/tmp/aipanel-e2e/.aipanel` で確認し、schema / entity 構造が docs と一致することを確認

## Blockers
- None

## Verification
- 2026-03-10 14:16 JST: `npm run typecheck` 成功
- 2026-03-10 14:43 JST: `test/unit/SessionManager.test.ts` pass
- 2026-03-10 14:43 JST: `test/integration/cli.test.ts` で `sessions`, `runs`, `artifacts` の作成と内容検証が pass
- 2026-03-10 14:42 JST: `/tmp/aipanel-e2e/.aipanel/sessions/session_f59dc3be-80e3-4a9d-80d9-406073da2cf1.json` を確認し、turn / providerRef / artifactId が保存されていることを確認
- 2026-03-10 14:42 JST: `/tmp/aipanel-e2e/.aipanel/runs/run_0b9e57b0-81c3-4fca-9c6e-1b94f2fcbb7e.json` と `/tmp/aipanel-e2e/.aipanel/runs/run_781d81b7-f3d8-48eb-8c75-043a3c863228.json` を確認し、direct / orchestrated 両方の run ledger を確認

## Decision Log
- 2026-03-10 13:50 JST: phase 1 は DB を入れず file-based JSON で始める。ローカル単体 CLI のため
- 2026-03-10 13:59 JST: `Session` だけでなく `Run`, `RunTask`, `TaskResult`, `Artifact`, `ContextBundle`, `ProviderResponse`, `NormalizedResponse`, `ComparisonReport` まで entity として扱う
- 2026-03-10 13:59 JST: 当時の方針では `ProviderRef` など identity を持たない leaf value を value object として分離した
- 2026-03-11 14:20 JST: cleanup で `ProviderRef`, `ExternalRef`, `ContextBundle` は現行設計から外し、`RunContext` 중심へ整理した

## Next Action
- Closed
