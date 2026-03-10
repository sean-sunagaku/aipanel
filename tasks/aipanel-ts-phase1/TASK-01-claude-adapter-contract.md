# TASK-01: Lock Claude Code adapter contract

## Status
- Status: done
- Owner: main
- Last Updated: 2026-03-10 14:00 JST

## Goal
- `ClaudeAdapter` の入出力契約を固定し、phase 1 実装で手戻りしないようにする

## Parent / Depends On
- Parent: `tasks/aipanel-ts-phase1/index.md`
- Dependencies: `TASK-00`

## Done When
- `consult` の非対話呼び出し方法が決まっている
- `followup` の resume 戦略が決まっている
- `Session.providerRefs` に保存する最小 field が決まっている
- adapter の成功 / 失敗レスポンス形が決まっている

## Checklist
- [x] `claude -p` の最小成功ケースを確認する
- [x] `-c`, `-r`, `--session-id` のどれが followup に向くか整理する
- [x] `--output-format` の使い方と parse 戦略を決める
- [x] timeout, exit code, stderr の扱いを決める
- [x] `Session.providerRefs` の最小 field を決める

## Progress Log
- 2026-03-10 13:50 JST: タスク作成。現時点では help オプション存在まで確認済みで、実呼び出し契約は未固定
- 2026-03-10 13:55 JST: タスク開始。Claude Code CLI を隔離ディレクトリで実行し、`-p`, `-c`, `-r`, `--output-format` の実測を取る方針にした
- 2026-03-10 13:55 JST: `--tools \"\" --model sonnet --output-format json` で `result` と `session_id` を取得できることを確認
- 2026-03-10 13:55 JST: `-c` と `-r <session_id>` は同一ディレクトリでは継続できた
- 2026-03-10 13:55 JST: 別ディレクトリからの `-r <session_id>` は `No conversation found` になったため、native resume は補助扱いに留める判断材料を得た
- 2026-03-10 13:55 JST: `error_max_budget_usd` は exit code 0 / `is_error=false` でも返るため、JSON `subtype` ベースの失敗判定が必要だと分かった

## Blockers
- None

## Verification
- 2026-03-10 13:55 JST
  - Type: manual check
  - Scope: Claude Code JSON output contract
  - Command: `claude -p --tools "" --model sonnet --output-format json "Reply with exactly TOKEN-BETA-5206bbb4 and nothing else."`
  - Result: pass
  - Notes: `result`, `session_id`, `total_cost_usd` を含む JSON を取得できた
- 2026-03-10 13:55 JST
  - Type: manual check
  - Scope: continue / resume behavior in same directory
  - Command: `claude -p --tools "" --model sonnet -c --output-format json "What exact token did you return in the previous reply? Reply with the token only."`
  - Result: pass
  - Notes: 直前 session を継続でき、同じ token を返した
- 2026-03-10 13:55 JST
  - Type: manual check
  - Scope: explicit resume by session id in same directory
  - Command: `claude -p --tools "" --model sonnet -r 933a9019-c0e9-41d8-b9a5-34a5578a0128 --output-format json "What exact token did you return in the previous reply? Reply with the token only."`
  - Result: pass
  - Notes: 同一ディレクトリでは session id 指定で継続できた
- 2026-03-10 13:55 JST
  - Type: manual check
  - Scope: explicit resume by session id across directories
  - Command: `claude -p --tools "" --model sonnet -r 933a9019-c0e9-41d8-b9a5-34a5578a0128 --output-format json "What exact token did you return in the previous reply? Reply with the token only."`
  - Result: fail
  - Notes: 別ディレクトリでは `No conversation found with session ID` になった。`-r` は portability が弱い
- 2026-03-10 13:55 JST
  - Type: manual check
  - Scope: budget failure shape
  - Command: `claude -p --tools "" --model sonnet --output-format json --max-budget-usd 0.01 "Reply with exactly TOKEN-GAMMA-5206bbb4 and nothing else."`
  - Result: partial
  - Notes: exit code 0 だが `subtype=error_max_budget_usd` が返った。adapter は `subtype` を見て failure 判定すべき

## Decision Log
- 2026-03-10 13:50 JST: まず CLI subprocess 契約を固定してから foundation に入る。ここが曖昧だと `followup` と repository schema がやり直しになる
- 2026-03-10 13:55 JST: `Session` の正本は `aipanel` 側に置くため、Claude の `-r` を正本の resume 機構にはしない
- 2026-03-10 13:55 JST: `-r` と `-c` は同一ディレクトリ最適化または補助ヒントとしてだけ扱う
- 2026-03-10 13:55 JST: phase 1 の `followup` は `aipanel` 側の turn 履歴再構築を基本にする
- 2026-03-10 13:55 JST: Claude adapter の success / failure 判定は exit code だけでなく JSON `subtype` も見る
- 2026-03-10 14:00 JST: `ProviderRef` の最小 field は `provider`, `providerSessionId`, `workingDirectory`, `lastUsedAt` とする
- 2026-03-10 14:00 JST: provider native resume が使えなくても `aipanel` 側の turn 再構築だけで `followup` を成立させる

## Next Action
- `TASK-02` で CLI foundation を作り、`TASK-03` で `ProviderRef` を含む schema に落とし込む
