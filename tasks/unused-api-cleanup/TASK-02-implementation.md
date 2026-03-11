# TASK-02: Remove unused APIs

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 11:20 JST

## Goal
- 確定した未使用 API を削除し、関連 export / README / tests を整える

## Parent / Depends On
- Parent: tasks/unused-api-cleanup/index.md
- Depends On: TASK-01

## Done When
- 確定候補がコードから削除されている
- 関連する export / README / tests の整合が取れている

## Checklist
- [x] 削除対象をファイルごとに整理する
- [x] コードを削除する
- [x] export / README / tests を追従修正する
- [x] 実装ログを記録する

## Progress Log
- 2026-03-11 10:53 JST: Task created
- 2026-03-11 10:53 JST: 確定候補の削除を実施した
- 2026-03-11 10:53 JST: README と test を確認し、今回削除したメソッド/関数への追従修正が不要であることを確認した
- 2026-03-11 11:20 JST: `Run#errorMessage|plan|planVersion` と未使用 `RunStatus` 値を削除した
- 2026-03-11 11:20 JST: root/app export から `CommandRouter` / `ProfileLoader` を外し、CLI は direct import に変更した
- 2026-03-11 11:20 JST: `shared/contracts.ts` を内部実使用の `ComparisonReportData` のみに縮小した
- 2026-03-11 11:34 JST: `src/*/index.ts` の不要 barrel を削除し、内部 import を direct path に寄せた
- 2026-03-11 11:34 JST: package を CLI-only 化し、`package.json` の import exports を閉じ、README の import usage を削除した
- 2026-03-11 11:34 JST: repository / artifact / profile の public helper を inline 化し、未使用 union 値も削除した
- 2026-03-11 11:32 JST: CLI-only 方針に合わせて package import surface を閉じ、`package.json` exports と README の import 記述を削除した
- 2026-03-11 11:32 JST: internal barrel file を direct import に置換し、`src/**/index.ts` を一括削除した
- 2026-03-11 11:32 JST: `shared/contracts.ts` を ComparisonEngine 内へ吸収して file ごと削除した
- 2026-03-11 11:33 JST: `package.json` の undocumented subpath export を削除し、root export は `AipanelApp` / `runCli` のみに縮小した
- 2026-03-11 11:33 JST: 使われなくなった `src/app/index.ts` を削除し、README / verify-package を新しい import surface に合わせて更新した

## Blockers
- None

## Verification
- 2026-03-11 11:20 JST: typecheck / test / pack dry-run の前段実装完了

## Decision Log
- 2026-03-11 10:53 JST: public export メソッドでも repo 実装未使用のものは削除した
- 2026-03-11 10:53 JST: README に直接登場しないメソッド削除のため、現時点では README 追従は不要と判断
- 2026-03-11 11:20 JST: README の import surface 記述は `CommandRouter` を外す形で追従修正した
- 2026-03-11 11:20 JST: `shared/contracts.ts` は internal 実使用の型だけ残し、未使用 public contract は削除した
- 2026-03-11 11:34 JST: tool 専用 package に寄せるため、library import surface は閉じる方針に切り替えた
- 2026-03-11 11:32 JST: package は CLI / CI tool 専用とし、library import surface は維持しない前提で整理した
- 2026-03-11 11:33 JST: documented subpath は `domain`, `providers`, `usecases`, `shared` に絞り、undocumented subpath export は package surface から除外した
- 2026-03-11 11:33 JST: root package import は `AipanelApp` と `runCli` に限定し、domain entity は `aipanel-cli/domain` に寄せた

## Next Action
- TASK-03 で検証を完了する
