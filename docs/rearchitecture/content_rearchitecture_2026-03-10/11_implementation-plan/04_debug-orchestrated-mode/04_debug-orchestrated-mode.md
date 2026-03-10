# Phase 04: Debug Orchestrated Mode

## Goal
Claude Code 単独でも `Run` 配下で複数 task を管理できる orchestrated mode を `debug` に導入する。

## Implementation Checklist
- [ ] `DebugUseCase` を実装する
- [ ] `PlanBuilder` の debug 向け最小版を作る
- [ ] `TaskScheduler` を実装する
- [ ] `TaskExecutor` を実装する
- [ ] `ResultMerger` を実装する
- [ ] `ValidationRunner` の最小版を実装する
- [ ] `ContextCollector` で logs / files / diffs を集める
- [ ] `ContextCollectorTask` を実装する
- [ ] reviewer task を Claude Code 観点別 task として実装する
- [ ] debug 入力ログを artifact として保存する
- [ ] merged result と validation note を run に保存する

## Acceptance Checklist
- [ ] `aipanel debug --log ... --question ...` が複数 task を作る
- [ ] task ごとの status と result が run に残る
- [ ] merged summary が返る
- [ ] validation step の結果が確認できる
- [ ] 入力ログや関連ファイルの artifact 参照が残る

## Verification Checklist
- [ ] task graph の unit test がある
- [ ] partial success 時に `Run.status=partial` が保存される
- [ ] artifact が後から辿れることを手動または test で確認する
- [ ] debug 成功時に session turn / run / artifact が整合していることを確認する

## Risks
- orchestrated mode を複雑にしすぎると phase 1 の完成が遅れる
- planner と validator を早く厚くしすぎるとメンテが重くなる

## Non-Goals
- provider をまたぐ本格 compare はまだやらない
- daemon 的なジョブ制御はまだやらない
