/**
 * AipanelApp を定義する。
 * このファイルは、CLI entrypoint から use case・repository・provider adapter を組み立てる application root を repo 内で一箇所に置くために存在する。
 */

import path from "node:path";

import { ArtifactRepository } from "../artifact/ArtifactRepository.js";
import { ComparisonEngine } from "../compare/ComparisonEngine.js";
import { ContextCollector } from "../context/ContextCollector.js";
import { ResultRenderer } from "../output/ResultRenderer.js";
import { ClaudeCodeAdapter } from "../providers/ClaudeCodeAdapter.js";
import { CodexExecAdapter } from "../providers/CodexExecAdapter.js";
import { ProviderRegistry } from "../providers/ProviderRegistry.js";
import { RunCoordinator } from "../run/RunCoordinator.js";
import { RunRepository } from "../run/RunRepository.js";
import { SessionManager } from "../session/SessionManager.js";
import { SessionRepository } from "../session/SessionRepository.js";
import { ConsultUseCase } from "../usecases/ConsultUseCase.js";
import { DebugUseCase } from "../usecases/DebugUseCase.js";
import { FollowupUseCase } from "../usecases/FollowupUseCase.js";
import { ListProvidersUseCase } from "../usecases/ListProvidersUseCase.js";
import { PlanUseCase } from "../usecases/PlanUseCase.js";
import { DEFAULT_PROVIDER } from "../shared/commands.js";

/**
 * Aipanel App を app 層の責務として定義する。
 * CLI entrypoint と use case・provider・renderer の接続責務を app 層へ集め、個々の command 実装が composition details を持たないようにする。
 */
export class AipanelApp {
  readonly resultRenderer: ResultRenderer;
  readonly providerRegistry: ProviderRegistry;
  readonly listProvidersUseCase: ListProvidersUseCase;
  readonly consultUseCase: ConsultUseCase;
  readonly followupUseCase: FollowupUseCase;
  readonly debugUseCase: DebugUseCase;
  readonly planUseCase: PlanUseCase;

  constructor({
    storageRoot = process.env.AIPANEL_STORAGE_ROOT ??
      path.join(process.cwd(), ".aipanel"),
    cwd = process.env.AIPANEL_CWD ?? process.cwd(),
  }: {
    storageRoot?: string;
    cwd?: string;
  } = {}) {
    this.resultRenderer = new ResultRenderer();

    const sessionRepository = new SessionRepository({ storageRoot });
    const runRepository = new RunRepository({ storageRoot });
    const artifactRepository = new ArtifactRepository({ storageRoot });
    const sessionManager = new SessionManager({
      repository: sessionRepository,
    });
    const runCoordinator = new RunCoordinator({ repository: runRepository });
    const contextCollector = new ContextCollector({ cwd });
    this.providerRegistry = new ProviderRegistry({
      adapters: [new ClaudeCodeAdapter(), new CodexExecAdapter()],
      defaultProvider: DEFAULT_PROVIDER,
    });

    this.listProvidersUseCase = new ListProvidersUseCase(this.providerRegistry);
    this.consultUseCase = new ConsultUseCase({
      sessionManager,
      runCoordinator,
      providerRegistry: this.providerRegistry,
      contextCollector,
      artifactRepository,
    });
    this.followupUseCase = new FollowupUseCase(this.consultUseCase);
    this.debugUseCase = new DebugUseCase({
      sessionManager,
      runCoordinator,
      providerRegistry: this.providerRegistry,
      contextCollector,
      artifactRepository,
      comparisonEngine: new ComparisonEngine(),
    });
    this.planUseCase = new PlanUseCase({
      sessionManager,
      runCoordinator,
      providerRegistry: this.providerRegistry,
      contextCollector,
      artifactRepository,
      comparisonEngine: new ComparisonEngine(),
    });
  }
}
