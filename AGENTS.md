# AGENTS.md

- 英語で think して、日本語で output する。

## Skill Placement

- `skills/` は公開用・配布用の Skill だけに使う。
- repo-private な Codex Skill は `.agents/skills/` 配下に置く。
- `docs/` 配下は補助ドキュメント置き場であり、invokable な Skill 本体は置かない。
- Skill として読ませたいディレクトリには `SKILL.md` と `agents/openai.yaml` を置く。

## This Repository

- 非公開のアーキテクチャ図更新 Skill は `.agents/skills/aipanel-diagrams/` に置く。
- 非公開の review retrospective / usage-review note 作成 Skill は `.agents/skills/aipanel-review-retrospective/` に置く。
- 非公開の source docs review / repair Skill は `.agents/skills/source-docs-review/` に置く。
- 非公開の未使用シンボル精査・削除 Skill は `.agents/skills/unused-symbol-pruning/` に置く。

## Validation

- repo-private Skill の静的検査は `pnpm run check:agent-skills` で行う。
- `scripts/architecture/` は draw.io/SVG の renderer なので、`.agents/skills/aipanel-diagrams/` がそれを使う間は残す。

## Type Safety

- `as` による型アサーションは基本すべて禁止とする。
- 分岐の型安全が必要なときは `ts-pattern` を優先する。
- `ts-pattern` を使う場合は `returnType(...)` を活用し、分岐結果の型を明示的に固定する。
