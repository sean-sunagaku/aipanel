# Source Map And Diagram Set

## Canonical Output Set

現行 implementation diagram set は以下の 5 つです。

- `architecture-overview`
- `direct-mode-data-flow`
- `debug-orchestrated-data-flow`
- `core-class-diagram`
- `persistence-data-model`

各図は以下の 2 種類を常に揃える。

- `docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/<name>.svg`
- `docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/<name>.drawio`

diagram bundle spec の canonical path:

- `docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json`

## Diagram Intent

### architecture-overview
- CLI entrypoint、app wiring、use case、provider boundary、repository、persistence root を示す
- 主ソース:
  - `src/app/AipanelApp.ts`
  - `src/app/CommandRouter.ts`
  - `src/providers/ProviderRegistry.ts`
  - `src/providers/ClaudeCodeAdapter.ts`

### direct-mode-data-flow
- `consult / followup` の実行フローを示す
- 主ソース:
  - `src/usecases/ConsultUseCase.ts`
  - `src/usecases/FollowupUseCase.ts`
  - `src/session/SessionManager.ts`
  - `src/run/RunCoordinator.ts`
  - `src/context/ContextCollector.ts`
  - `src/artifact/ArtifactRepository.ts`

### debug-orchestrated-data-flow
- `debug` の role-based task flow と merge を示す
- 主ソース:
  - `src/usecases/DebugUseCase.ts`
  - `src/compare/ComparisonEngine.ts`
  - `src/run/RunCoordinator.ts`
  - `src/providers/ClaudeCodeAdapter.ts`

### core-class-diagram
- application class、coordination / infrastructure class、domain entity を示す
- 主ソース:
  - `src/app/AipanelApp.ts`
  - `src/usecases/*.ts`
  - `src/session/*.ts`
  - `src/run/*.ts`
  - `src/providers/*.ts`
  - `src/domain/*.ts`

### persistence-data-model
- `.aipanel` layout と `Session / Run / Artifact` を中心にした保存構造を示す
- 主ソース:
  - `src/domain/session.ts`
  - `src/domain/run.ts`
  - `src/domain/artifact.ts`
  - `src/session/SessionRepository.ts`
  - `src/run/RunRepository.ts`
  - `src/artifact/ArtifactRepository.ts`

## Guardrails

- phase 2 構想は補足 note にとどめ、primary box / edge は現行 code に合わせる
- class diagram が密になりすぎる場合、value object は note へ逃がす
- direct flow と orchestrated flow は混ぜずに別図にする
