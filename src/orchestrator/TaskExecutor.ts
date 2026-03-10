import type {
  ArtifactRepositoryPort,
  NormalizedResponseData,
  PlanTaskSpec,
  ProviderRegistryPort,
  RunCoordinatorPort,
  RunData,
  RunTaskData,
  SessionData,
} from "../shared/contracts.js";
import type { ResponseNormalizer } from "../compare/ResponseNormalizer.js";

export interface TaskExecutorDependencies {
  providerRegistry: ProviderRegistryPort;
  artifactRepository: ArtifactRepositoryPort;
  responseNormalizer: ResponseNormalizer;
  runCoordinator: RunCoordinatorPort;
}

export class TaskExecutor {
  readonly #providerRegistry: ProviderRegistryPort;
  readonly #artifactRepository: ArtifactRepositoryPort;
  readonly #responseNormalizer: ResponseNormalizer;
  readonly #runCoordinator: RunCoordinatorPort;

  constructor(dependencies: TaskExecutorDependencies) {
    this.#providerRegistry = dependencies.providerRegistry;
    this.#artifactRepository = dependencies.artifactRepository;
    this.#responseNormalizer = dependencies.responseNormalizer;
    this.#runCoordinator = dependencies.runCoordinator;
  }

  async executePlan(input: {
    session: SessionData;
    run: RunData;
    taskSpecs: PlanTaskSpec[];
  }): Promise<{ run: RunData; normalizedResponses: NormalizedResponseData[] }> {
    const normalizedResponses: NormalizedResponseData[] = [];
    let currentRun = input.run;

    for (const spec of input.taskSpecs) {
      const task = await this.#runCoordinator.appendTask({
        runId: currentRun.runId,
        taskKind: spec.taskKind,
        role: spec.role,
        provider: spec.provider ?? null,
        dependsOn: spec.dependsOn ?? [],
        prompt: spec.prompt,
      });

      const { updatedRun, normalizedResponse } = await this.#executeTask({
        session: input.session,
        run: currentRun,
        task,
        prompt: spec.prompt,
      });

      currentRun = updatedRun;
      normalizedResponses.push(normalizedResponse);
    }

    return { run: currentRun, normalizedResponses };
  }

  async #executeTask(input: {
    session: SessionData;
    run: RunData;
    task: RunTaskData;
    prompt: string;
  }): Promise<{ updatedRun: RunData; normalizedResponse: NormalizedResponseData }> {
    const provider = input.task.provider ?? "claude-code";
    const adapter = this.#providerRegistry.get(provider);
    const providerRef = input.session.providerRefs.find((ref) => ref.provider === provider) ?? null;
    const providerResponse = await adapter.call({
      provider,
      prompt: input.prompt,
      sessionHint: providerRef,
      mode: input.run.mode,
    });

    const rawTextArtifact = await this.#artifactRepository.saveArtifact({
      kind: "provider-raw-text",
      runId: input.run.runId,
      sessionId: input.session.sessionId,
      taskId: input.task.taskId,
      extension: "txt",
      content: providerResponse.rawText ?? "",
    });

    const rawJsonArtifact = await this.#artifactRepository.saveArtifact({
      kind: "provider-raw-json",
      runId: input.run.runId,
      sessionId: input.session.sessionId,
      taskId: input.task.taskId,
      extension: "json",
      content: JSON.stringify(providerResponse.rawJson ?? {}, null, 2),
    });

    providerResponse.rawTextRef = rawTextArtifact.path;
    providerResponse.rawJsonRef = rawJsonArtifact.path;

    const normalizedResponse = this.#responseNormalizer.normalize({
      taskId: input.task.taskId,
      providerResponse,
    });

    const updatedRun = await this.#runCoordinator.appendTaskResult({
      runId: input.run.runId,
      taskId: input.task.taskId,
      summary: normalizedResponse.summary,
      findings: normalizedResponse.findings,
      citations: normalizedResponse.citations,
      confidence: normalizedResponse.confidence,
      sourceArtifactIds: [rawTextArtifact.artifactId, rawJsonArtifact.artifactId],
      providerResponse,
      normalizedResponse,
    });

    return { updatedRun, normalizedResponse };
  }
}
