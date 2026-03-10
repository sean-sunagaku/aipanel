# Phase 02: Persistence And Models

## Goal
`Session`, `Run`, `Artifact` aggregate を正本として保存できる最小モデルと repository を作る。  
あわせて `SessionTurn`, `RunTask`, `TaskResult`, `ContextBundle`, `ProviderResponse`, `NormalizedResponse`, `ComparisonReport` の entity 境界と value object 境界を固定する。

## Implementation Checklist
- [ ] `Session` aggregate root と `SessionTurn` entity を定義する
- [ ] `Run` aggregate root と `RunTask`, `TaskResult` entity を定義する
- [ ] `ContextBundle`, `ProviderResponse`, `NormalizedResponse`, `ComparisonReport` entity を定義する
- [ ] `Artifact` aggregate root を定義する
- [ ] `ProviderRef`, `Usage`, `Citation`, `TaskDependency`, `FileRef`, `DiffRef`, `LogRef`, `ConfidenceScore`, `ExternalRef` を value object として定義する
- [ ] schema version field を導入する
- [ ] `SessionRepository` を JSON file backend で実装する
- [ ] `RunRepository` を JSON file backend で実装する
- [ ] `ArtifactRepository` の path / metadata 保存を実装する
- [ ] `IdGenerator` と `Clock` を導入する
- [ ] partial failure 時の `Run.status` 保存を実装する

## Acceptance Checklist
- [ ] session を新規作成して読み戻せる
- [ ] run を作成して task 状態を更新できる
- [ ] artifact metadata を保存して参照できる
- [ ] 失敗 run でも metadata が残る

## Verification Checklist
- [ ] repository round-trip test が通る
- [ ] schema version を含む fixture test がある
- [ ] `.aipanel/sessions`, `.aipanel/runs`, `.aipanel/artifacts` の layout が docs 通りである

## Risks
- schema を重くしすぎると phase 1 の変更速度が落ちる
- `Session` と `Run` の間で同じ情報を二重保持しやすい
- 何でも entity に寄せすぎると value object の簡潔さを失う

## Non-Goals
- compare 用の完全 schema はこの phase で作り込まない
- DB への切り替えは考えない
