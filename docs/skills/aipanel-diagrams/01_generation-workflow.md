# Diagram Generation Workflow

## Goal

Codex sub-agent が diagram bundle JSON spec を作成し、それを renderer で draw.io / SVG に変換する。

現行 implementation diagram set の出力先は以下。

`docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams`

## Standard Flow

1. 図の意味変更が必要かを確認する。
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

2. Codex sub-agent に spec JSON を作らせる。
   - `docs/skills/aipanel-diagrams/03_subagent-workflow.md`
   - `docs/skills/aipanel-diagrams/04_diagram-bundle-template.json`
   - `docs/skills/aipanel-diagrams/05_subagent-prompt-template.md`
   - 保存先:
     - `docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json`

3. renderer で全出力を再生成する。

```bash
node scripts/architecture/render-diagram-bundle.mjs \
  docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json \
  docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams
```

4. SVG を検証する。

```bash
xmllint --noout docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/*.svg
```

5. source と export の対応を確認する。

```bash
find docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams -maxdepth 3 -type f | sort
```

6. 導線が変わった場合は docs を更新する。
   - `README.md`
   - `docs/rearchitecture/content_rearchitecture_2026-03-10/00_overview/00_overview.md`
   - `docs/rearchitecture/content_rearchitecture_2026-03-10/10_formal-architecture/10_formal-architecture.md`

## Notes

- この環境では diagram 内容の生成に Claude CLI ではなく Codex sub-agent を使う
- renderer は `.drawio` と `.svg` と companion Markdown を同時に出力する
- diagram set が変わった場合は `12_current-implementation-diagrams.md` の reading guide も更新する
- spec JSON そのものも `source/` 配下の artifact として保存する
