# Phase 03: Direct Mode Commands

## Goal
最小 UX として `consult`, `followup`, `providers` を使える状態にする。

## Implementation Checklist
- [ ] `ConsultUseCase` を実装する
- [ ] `FollowupUseCase` を実装する
- [ ] `ListProvidersUseCase` を実装する
- [ ] `SessionManager` を実装する
- [ ] `RunCoordinator` の direct mode を実装する
- [ ] `ResultRenderer` の text 出力を実装する
- [ ] `ResponseNormalizer` の最小版を実装する
- [ ] consult 実行時に `Session` と `Run` を保存する
- [ ] followup 実行時に session resume または fallback 再構築を実装する

## Acceptance Checklist
- [ ] `aipanel consult "..."` が Claude Code へ問い合わせて結果を返す
- [ ] `aipanel consult` 実行後に session と run が保存される
- [ ] `aipanel followup <sessionId> "..."` が継続相談として動く
- [ ] `aipanel providers` が `claude-code` を返す

## Verification Checklist
- [ ] consult の integration test または smoke test がある
- [ ] followup の resume 成功ケースと fallback ケースを検証する
- [ ] Claude Code 実行失敗時に `Run.status=failed` が残ることを確認する

## Risks
- Claude Code の resume 契約が弱いと followup 実装が揺れる
- `ResponseNormalizer` を compare 用に重くしすぎると direct mode が遅くなる

## Non-Goals
- multi-task orchestration はまだ入れすぎない
- compare command の公開はまだ必須にしない
