# TASK-07: Simplify CLI and Internal Naming

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-11 15:35 JST

## Goal
- CLI の入力面を `question` と再現性フラグ中心に絞る。
- 内部モデルと永続化名を、読んで意味が伝わる名前へ寄せる。
- README と help を現状の設計に合わせて簡素化する。

## Parent / Depends On
- Parent: `tasks/aipanel-ts-phase1/index.md`
- Depends On: `TASK-04`, `TASK-05`, `TASK-06`

## Done When
- `files / diffs / logs / title / provider session tracking` の不要契約が削除されている。
- `RunContext` の形が `summary + question + cwd + collectedAt + artifactPath` に整理されている。
- `reviewStatus` など実態に合う名前へ整理されている。
- README / help / tests が新しい前提に追従し、`pnpm run lint`, `pnpm run typecheck`, `pnpm test` が通る。

## Checklist
- [x] CLI option を `--provider`, `--model`, `--timeout`, `--session`, `--json` へ整理する
- [x] `followup` の `--session` 専用性を help / README に明記する
- [x] `ContextCollector` を prompt-only 実行メタデータへ簡素化する
- [x] `ContextBundle` を `RunContext` に整理し、`metadata` の入れ子をなくす
- [x] ローカルで `lint`, `typecheck`, `test` を通す
- [x] GitHub Actions の最新 `CI` と `Source Comments` の成功を確認する
- [x] `providerSessionId` / `ProviderRef` / `providerRefs` を完全削除する
- [x] `externalRefs` を削除する
- [x] `validationStatus` を `reviewStatus` へ変更する
- [x] README の最短導線を先頭寄りに再構成する
- [x] test 共通 helper を導入し、payload parse / sandbox 準備の重複を減らす
- [x] `as` を避ける型安全方針を `AGENTS.md` と実装へ反映する

## Progress Log
- 2026-03-11 14:20 JST: タスク作成。CLI option 簡素化の残作業を棚卸し。
- 2026-03-11 14:20 JST: `ContextCollector` を prompt-only メタデータへ縮小し、`RunContext` へ命名整理。
- 2026-03-11 14:20 JST: `followup` の `--session` 専用性を help / README に反映。
- 2026-03-11 14:20 JST: `pnpm run lint`, `pnpm run typecheck`, `pnpm test` を実行し成功。
- 2026-03-11 14:20 JST: GitHub Actions の最新 `CI` と `Source Comments` が success であることを確認。
- 2026-03-11 15:05 JST: `ProviderRef` / `providerRefs` / `externalRefs` を削除し、session 正本を transcript のみに整理。
- 2026-03-11 15:05 JST: `validationStatus` を `reviewStatus` に寄せ、README に quick start を追加。
- 2026-03-11 15:35 JST: `literalTuple` と `ts-pattern` を使って `as` を撤去し、test support に payload / sandbox helper を追加。

## Blockers
- None

## Verification
- 2026-03-11 14:20 JST: `pnpm run lint` passed
- 2026-03-11 14:20 JST: `pnpm run typecheck` passed
- 2026-03-11 14:20 JST: `pnpm test` passed
- 2026-03-11 14:20 JST: GitHub Actions `CI` run `22936246181` success
- 2026-03-11 14:20 JST: GitHub Actions `Source Comments` run `22935357814` success
- 2026-03-11 14:21 JST: README と task ledger を現行 simplification 方針へ同期し、`ProviderRef` / `providerRefs` / `providerSessionId` 非採用、`RunContext` terminology、`--session` の `followup` 専用性、`reviewStatus` wording を確認

## Decision Log
- 2026-03-11 14:20 JST: CLI は `question` と再現性フラグ中心に保ち、外部 context 注入フラグは戻さない。
- 2026-03-11 14:20 JST: `ContextBundle` は名前が重く実態に合わないため `RunContext` へ寄せる。
- 2026-03-11 14:20 JST: `--session` は `followup` 専用として明示する。
- 2026-03-11 15:05 JST: provider の native session 追跡は phase 1 の正本設計とズレるため削除する。
- 2026-03-11 15:05 JST: 結果の健康度は `validation` より `review` の方が実態に近いため `reviewStatus` を採用する。
- 2026-03-11 15:35 JST: TypeScript では `as` を常用せず、literal tuple helper と `ts-pattern` の `returnType(...)` で型を固定する。

## Next Action
- Closed
