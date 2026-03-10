# Phase 00: Scope And Spike

## Goal
実装開始前に、あとからやり直しコストが大きい項目を固定する。

## Implementation Checklist
- [ ] 実装言語を TypeScript / Node.js として固定する
- [ ] phase 1 の必須 command を `consult`, `followup`, `debug`, `providers` に固定する
- [ ] `compare` は phase 1 では hidden か optional にする方針を固定する
- [ ] `claude` CLI の非対話実行契約を確認する
- [ ] `claude` の continue / resume 契約を確認する
- [ ] `Session`, `Run`, `RunTask`, `TaskResult`, `Artifact` の最小 field 一覧を決める
- [ ] entity と value object の境界を固定する
- [ ] file-based JSON persistence で開始するかを固定する

## Acceptance Checklist
- [ ] Claude Code adapter の I/O 契約メモが残っている
- [ ] `Session.providerRefs` に保存する候補 field が決まっている
- [ ] `.aipanel/` 配下の保存レイアウトが決まっている
- [ ] phase 1 で何を作らないかが明文化されている

## Verification Checklist
- [ ] `claude --help` で必要オプションを確認する
- [ ] 実環境で非対話実行が可能かを手動確認する
- [ ] resume 相当のオプションが安定して使えるかを手動確認する
- [ ] 例示 JSON を 1 つずつ書き出して schema が過不足ないか確認する

## Risks
- `claude` の resume 契約が想定より弱い場合、`followup` は `aipanel` 側で再構築する fallback が必要になる
- field を増やしすぎると phase 1 の実装が遅くなる

## Non-Goals
- この phase では production code を増やしすぎない
- orchestrated mode の本実装には入らない
