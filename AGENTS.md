# AGENTS.md

- 英語で think して、日本語で output する。

## Skill Placement

- `skills/` は公開用・配布用の Skill だけに使う。
- repo-private な Codex Skill は `.agent/skills/` 配下に置く。
- `docs/` 配下は補助ドキュメント置き場であり、invokable な Skill 本体は置かない。
- Skill として読ませたいディレクトリには `SKILL.md` と `agents/openai.yaml` を置く。

## This Repository

- 非公開のアーキテクチャ図更新 Skill は `.agent/skills/aipanel-diagrams/` に置く。

## Validation

- repo-private Skill の静的検査は `npm run check:agent-skills` で行う。
- `scripts/architecture/` は draw.io/SVG の renderer なので、`.agent/skills/aipanel-diagrams/` がそれを使う間は残す。
