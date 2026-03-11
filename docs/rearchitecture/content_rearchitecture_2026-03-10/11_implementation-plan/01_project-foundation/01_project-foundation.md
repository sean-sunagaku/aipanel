# Phase 01: Project Foundation

## Historical Note
この phase 記録は当時の実装計画ログである。ここで導入した `WorkflowSelector` は 2026-03-11 の整理で削除済み。

## Goal
CLI アプリとしての最小骨格と、Claude Code adapter の差し込み口を作る。

## Implementation Checklist
- [x] `package.json` を初期化する
- [x] `tsconfig.json` を作る
- [x] `src/cli/aipanel.ts` を作る
- [x] `src/app`, `src/usecases`, `src/providers`, `src/output` の最小 module を作る
- [x] `CommandRouter` を実装する
- [x] `WorkflowSelector` の最小版を実装する
- [x] `ProviderRegistry` と `ProviderAdapter` interface を定義する
- [x] `ClaudeAdapter` の subprocess 実行版を作る
- [x] 統一エラー型と exit code 方針を決める
- [x] `providers` command の最小出力を作る

## Acceptance Checklist
- [x] `npm run build` が通る
- [x] `node ./dist/bin/aipanel.js providers` が動く
- [x] `aipanel providers` が `claude-code` を返す
- [x] `ClaudeAdapter` をモック差し替えできる
- [x] CLI help が最低限使える

## Verification Checklist
- [x] `tsx --test test/unit/**/*.test.ts` が通る
- [x] subprocess 実行の失敗時に整形されたエラーが返る
- [x] adapter の subprocess 呼び出しが timeout 可能である

## Validation Notes
- real Claude Code smoke run は PTY-backed terminal で確認済み
- automated integration test は fake `claude` binary を使って `providers`, `consult`, `followup`, `debug` を通す
- real Claude Code smoke run は PTY-backed terminal で確認している

## Risks
- adapter を先に厚く作りすぎると phase 1 の速度が落ちる
- provider subprocess ラッパの責務が増えすぎると provider 境界が崩れる

## Non-Goals
- この phase では session 永続化を完成させない
- `debug` や `followup` の本実装にはまだ入らない
