# TASK-01: Unused API audit

## Status
- Status: doing
- Owner: main
- Last Updated: 2026-03-11 10:53 JST

## Goal
- repo 全体で未使用メソッド・関数・公開 API の候補を洗い出し、削除対象を確定する

## Parent / Depends On
- Parent: tasks/unused-api-cleanup/index.md
- Depends On: none

## Done When
- 削除候補一覧が確定している
- 削除候補ごとに「なぜ未使用と判断したか」が記録されている
- 対称 API や公開 export の扱いが候補単位で明文化されている

## Checklist
- [x] 候補抽出ルールを固定する
- [x] class method / static method / exported function を棚卸しする
- [x] `src/` 実ランタイム参照を確認する
- [x] `test/` / README / package exports の参照を確認する
- [x] 削除候補と grouped deletion 候補を確定する

## Progress Log
- 2026-03-11 10:53 JST: Task created
- 2026-03-11 10:53 JST: `src/` 実ランタイム参照を基準に候補抽出を開始
- 2026-03-11 10:53 JST: 高信頼候補を確定した。`Run#setPlan`、`Run#complete`、`Run#fail`、`RunCoordinator#transition|complete|fail`、`RunRepository#get|require|list`、`SessionRepository#list`、`SessionManager#save`、`ArtifactRepository#get|listByRun`、`ProviderRegistry#defaultProvider`、`coerceRecord`、`systemClock.now`、`readJson`、`writeJson`、`listDirectory`、`AipanelError`
- 2026-03-11 11:20 JST: dead field / public surface も追加監査し、`Run.plan|planVersion|errorMessage`、未使用 `RunStatus` 値、root/app export の `CommandRouter` / `ProfileLoader`、`shared/contracts.ts` の未使用型群を次段候補に追加

## Blockers
- None

## Verification
- 2026-03-11 10:53 JST: `rg` と TypeScript language service で in-repo 参照を確認し、上記候補が `src/` から未使用であることを確認
- 2026-03-11 11:20 JST: 追加候補は `npm run typecheck` 前提で dead field / public surface として確認

## Decision Log
- 2026-03-11 10:53 JST: `src/` 実ランタイムで未使用のものを削除候補にする
- 2026-03-11 10:53 JST: `test/` と README のみの参照は使用中とはみなさない
- 2026-03-11 10:53 JST: public export でも実利用用途がないものは削除対象に含める
- 2026-03-11 10:53 JST: `Run#complete|fail` は `RunCoordinator#complete|fail` からしか呼ばれないため grouped deletion とした
- 2026-03-11 10:53 JST: `ArtifactRepository#get|listByRun` は相互依存のみで外部参照がないため grouped deletion とした

## Next Action
- TASK-02 に進み、確定候補を削除する
