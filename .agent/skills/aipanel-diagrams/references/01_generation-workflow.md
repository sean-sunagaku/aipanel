# Diagram Generation Workflow

## Goal

Codex sub-agent が diagram bundle JSON spec を作成し、main agent がその reviewed spec を保存して renderer で draw.io / SVG に変換する。

現行 implementation diagram set の出力先は以下。

`docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams`

## Standard Flow

1. repo-local Skill を入口にする。
   - `.agent/skills/aipanel-diagrams/SKILL.md`

2. 図の意味変更が必要かを確認する。
   - `bin/aipanel.ts`
   - `src/cli/aipanel.ts`
   - `src/app/*`
   - `src/usecases/*`
   - `src/session/*`
   - `src/run/*`
   - `src/providers/*`
   - `src/artifact/*`
   - `src/context/*`
   - `src/domain/*`

3. Codex sub-agent に full bundle spec JSON を作らせる。
   - `.agent/skills/aipanel-diagrams/references/03_subagent-workflow.md`
   - `.agent/skills/aipanel-diagrams/references/04_diagram-bundle-template.json`
   - `.agent/skills/aipanel-diagrams/references/05_subagent-prompt-template.md`
   - 保存先:
     - `docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json`

4. main agent が JSON をレビューして保存する。
   - spec を source of truth とする
   - `.drawio` と `.svg` はまだ手で直さない

5. renderer で全出力を再生成する。

```bash
node scripts/architecture/render-diagram-bundle.mjs \
  docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json \
  docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams
```

6. SVG を検証する。

```bash
xmllint --noout docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/*.svg
```

7. source と export の対応を確認する。

```bash
find docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams -maxdepth 3 -type f | sort
```

8. 導線が変わった場合は docs を更新する。
   - `README.md`
   - `docs/rearchitecture/content_rearchitecture_2026-03-10/00_overview/00_overview.md`
   - `docs/rearchitecture/content_rearchitecture_2026-03-10/10_formal-architecture/10_formal-architecture.md`

## Notes

- この環境では diagram 内容の生成に Claude CLI ではなく Codex sub-agent を使う
- spec JSON が一次成果物で、renderer は `.drawio` と `.svg` と companion Markdown を同時に出力する
- diagram set が変わった場合は `12_current-implementation-diagrams.md` の reading guide も更新する
- spec JSON そのものも `source/` 配下の artifact として保存する
