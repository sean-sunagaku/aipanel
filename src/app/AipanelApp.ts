import path from "node:path";

import { ArtifactRepository } from "../artifact/ArtifactRepository.js";
import { ComparisonEngine } from "../compare/ComparisonEngine.js";
import { ContextCollector } from "../context/ContextCollector.js";
import { ResultRenderer } from "../output/ResultRenderer.js";
import {
  ClaudeCodeAdapter,
  CodexExecAdapter,
  ProviderRegistry,
} from "../providers/index.js";
import { RunCoordinator, RunRepository } from "../run/index.js";
import { SessionManager, SessionRepository } from "../session/index.js";
import {
  ConsultUseCase,
  DebugUseCase,
  FollowupUseCase,
  ListProvidersUseCase,
} from "../usecases/index.js";
import { ProfileLoader } from "./ProfileLoader.js";
import { WorkflowSelector } from "./WorkflowSelector.js";

export class AipanelApp {
  readonly profileLoader: ProfileLoader;
  readonly workflowSelector: WorkflowSelector;
  readonly resultRenderer: ResultRenderer;
  readonly providerRegistry: ProviderRegistry;
  readonly listProvidersUseCase: ListProvidersUseCase;
  readonly consultUseCase: ConsultUseCase;
  readonly followupUseCase: FollowupUseCase;
  readonly debugUseCase: DebugUseCase;

  constructor({
    storageRoot = process.env.AIPANEL_STORAGE_ROOT ??
      path.join(process.cwd(), ".aipanel"),
    cwd = process.env.AIPANEL_CWD ?? process.cwd(),
  }: {
    storageRoot?: string;
    cwd?: string;
  } = {}) {
    this.profileLoader = new ProfileLoader(storageRoot);
    this.workflowSelector = new WorkflowSelector();
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
      defaultProvider: "claude-code",
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
  }
}
