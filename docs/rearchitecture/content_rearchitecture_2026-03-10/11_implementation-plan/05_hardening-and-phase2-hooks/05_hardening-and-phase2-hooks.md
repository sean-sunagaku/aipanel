# Phase 05: Hardening And Phase 2 Hooks

## Goal
phase 1 の完成度を上げつつ、phase 2 の multi-provider / compare / richer multi-agent に備える。

## Implementation Checklist
- [ ] schema migration 方針を決める
- [ ] `NormalizedResponse` を phase 1 必要最小限に絞って固定する
- [ ] `CompareUseCase` の placeholder 方針を決める
- [ ] second provider を追加する時の adapter checklist を docs 化する
- [ ] `RoleAssignmentPolicy` の差し込み口を用意する
- [ ] command help と examples を整える
- [ ] failure report の出力形式を整える
- [ ] smoke test 手順を docs 化する

## Acceptance Checklist
- [ ] phase 1 の command surface が docs と一致している
- [ ] future second provider 追加時の変更点が明文化されている
- [ ] compare を導入しても壊れにくい境界が残っている

## Verification Checklist
- [ ] backward compatibility を壊さない fixture test がある
- [ ] README と architecture docs のリンクが最新である
- [ ] manual smoke steps で `consult`, `followup`, `debug`, `providers` を一通り確認できる

## Risks
- phase 1 の完成前に phase 2 の抽象を入れすぎると失速する
- compare placeholder を先に露出すると UX が中途半端になる

## Non-Goals
- second provider の本実装
- MCP facade
- local daemon
