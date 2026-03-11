import { ResponseNormalizer } from "../compare/ResponseNormalizer.js";
import type {
  CitationProps,
  ExternalRefProps,
  ProviderRefProps,
  UsageProps,
} from "../domain/value-objects.js";
import type {
  ContextBundleLike,
  ContextCollector,
} from "../context/ContextCollector.js";
import type { ArtifactRepository } from "../artifact/ArtifactRepository.js";
import type { ProviderRegistry } from "../providers/ProviderRegistry.js";
import type { ProviderCallResult } from "../providers/ProviderAdapter.js";
import type { RunCoordinator } from "../run/RunCoordinator.js";
import type { SessionManager } from "../session/SessionManager.js";
import { systemClock } from "../shared/clock.js";

type AdapterCallResult = ProviderCallResult & {
  usage?: UsageProps | null;
  externalRefs?: ExternalRefProps[];
  citations?: CitationProps[];
};

interface ConsultationInput {
  command: "consult" | "followup";
  question: string;
  sessionId?: string;
  title?: string;
  files?: string[];
  diffs?: string[];
  logs?: string[];
  providerName: string;
  model?: string;
  timeoutMs: number;
  cwd: string;
}

export interface ConsultationResult {
  kind: "consultation";
  sessionId: string;
  runId: string;
  answer: string;
  provider: string;
  model: string;
  status: "completed" | "partial";
  validationStatus: string;
}

export class ConsultUseCase {
  readonly sessionManager: SessionManager;
  readonly runCoordinator: RunCoordinator;
  readonly providerRegistry: ProviderRegistry;
  readonly contextCollector: ContextCollector;
  readonly artifactRepository: ArtifactRepository;
  readonly responseNormalizer: ResponseNormalizer;
  readonly clock: typeof systemClock;

  constructor({
    sessionManager,
    runCoordinator,
    providerRegistry,
    contextCollector,
    artifactRepository,
    responseNormalizer = new ResponseNormalizer(),
    clock = systemClock,
  }: {
    sessionManager: SessionManager;
    runCoordinator: RunCoordinator;
    providerRegistry: ProviderRegistry;
    contextCollector: ContextCollector;
    artifactRepository: ArtifactRepository;
    responseNormalizer?: ResponseNormalizer;
    clock?: typeof systemClock;
  }) {
    this.sessionManager = sessionManager;
    this.runCoordinator = runCoordinator;
    this.providerRegistry = providerRegistry;
    this.contextCollector = contextCollector;
    this.artifactRepository = artifactRepository;
    this.responseNormalizer = responseNormalizer;
    this.clock = clock;
  }

  async execute(input: ConsultationInput): Promise<ConsultationResult> {
    const model = input.model;
    const session = await this.sessionManager.startOrResume({
      title: input.title ?? input.question.slice(0, 80),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    });
    await this.sessionManager.appendUserTurn(session, input.question);

    const run = await this.runCoordinator.createRun({
      sessionId: session.sessionId,
      command: input.command,
      mode: "direct",
    });

    const rawContext = await this.contextCollector.collect({
      question: input.question,
      cwd: input.cwd,
      ...(input.files ? { files: input.files } : {}),
      ...(input.diffs ? { diffs: input.diffs } : {}),
      ...(input.logs ? { logs: input.logs } : {}),
    });
    const contextArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "context-bundle",
      content: rawContext,
    });
    this.runCoordinator.createContextBundle(
      run,
      this.#toContextBundleProps(run.runId, rawContext, contextArtifact),
    );
    run.transition("planned", this.clock.nowIso());
    await this.runCoordinator.save(run);

    const prompt = this.#buildPrompt(
      session.buildTranscript(),
      input.question,
      this.contextCollector.formatForPrompt(rawContext),
    );
    const task = this.runCoordinator.createTask(run, {
      taskKind: "provider-review",
      role: input.command === "followup" ? "followup" : "consult",
      provider: input.providerName,
      dependsOn: [],
      status: "queued",
      input: { prompt },
    });
    task.transition("running", this.clock.nowIso());
    run.transition("running", this.clock.nowIso());
    await this.runCoordinator.save(run);

    const adapter = this.providerRegistry.get(input.providerName);
    const adapterResult: AdapterCallResult = await adapter.call({
      provider: input.providerName,
      prompt,
      cwd: input.cwd,
      timeoutMs: input.timeoutMs,
      ...(model !== undefined ? { model } : {}),
    });

    const rawJsonArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "provider-response-json",
      content: adapterResult.rawJson ?? { rawText: adapterResult.rawText },
    });
    const rawTextArtifact = await this.artifactRepository.writeTextArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "provider-response-text",
      content: adapterResult.rawText,
      extension: ".txt",
      mimeType: "text/plain",
    });

    this.runCoordinator.createProviderResponse(run, {
      taskId: task.taskId,
      provider: adapterResult.provider,
      model: adapterResult.model,
      rawTextRef: rawTextArtifact.path,
      rawJsonRef: rawJsonArtifact.path,
      usage: adapterResult.usage ?? null,
      latencyMs: adapterResult.usage?.latencyMs ?? null,
      externalRefs: adapterResult.externalRefs ?? [],
    });

    const normalizedDraft = this.responseNormalizer.normalize({
      taskId: task.taskId,
      providerResponse: {
        provider: adapterResult.provider,
        rawText: adapterResult.rawText,
        citations: adapterResult.citations ?? [],
        isError: adapterResult.isError ?? false,
      },
    });
    this.runCoordinator.createNormalizedResponse(run, {
      taskId: task.taskId,
      provider: adapterResult.provider,
      summary: normalizedDraft.summary,
      findings: normalizedDraft.findings,
      suggestions: normalizedDraft.suggestions,
      citations: normalizedDraft.citations,
      confidence: normalizedDraft.confidence,
    });
    this.runCoordinator.createTaskResult(run, {
      taskId: task.taskId,
      summary: normalizedDraft.summary || adapterResult.rawText,
      findings: normalizedDraft.findings,
      citations: normalizedDraft.citations,
      confidence: normalizedDraft.confidence,
      sourceArtifactIds: [
        rawJsonArtifact.artifactId,
        rawTextArtifact.artifactId,
      ],
    });

    const isError = adapterResult.isError ?? false;
    task.transition(isError ? "failed" : "completed", this.clock.nowIso());
    run.finalSummary = normalizedDraft.summary || adapterResult.rawText;
    run.validationStatus = isError ? "needs-review" : "validated";
    run.transition(isError ? "partial" : "completed", this.clock.nowIso());
    await this.runCoordinator.save(run);

    const providerRef = this.#extractProviderRef(
      adapterResult.externalRefs ?? [],
      adapterResult.provider,
      input.cwd,
    );
    if (providerRef) {
      await this.sessionManager.updateProviderRef(session, providerRef);
    }

    await this.sessionManager.appendAssistantTurn(
      session,
      adapterResult.rawText,
      [rawJsonArtifact.artifactId, rawTextArtifact.artifactId],
    );

    return {
      kind: "consultation",
      sessionId: session.sessionId,
      runId: run.runId,
      answer: adapterResult.rawText,
      provider: input.providerName,
      model: adapterResult.model,
      status: isError ? "partial" : "completed",
      validationStatus: run.validationStatus ?? "validated",
    };
  }

  #buildPrompt(
    transcript: string,
    question: string,
    contextText: string,
  ): string {
    const sections = [
      "You are an AI coding assistant running under aipanel.",
      transcript ? `Conversation so far:\n${transcript}` : "",
      contextText ? `Additional context:\n${contextText}` : "",
      `Current question:\n${question}`,
      "Reply with a direct, practical answer. If there are risks or assumptions, state them explicitly.",
    ].filter(Boolean);

    return sections.join("\n\n");
  }

  #toContextBundleProps(
    runId: string,
    rawContext: ContextBundleLike,
    contextArtifact: { artifactId: string; path: string },
  ) {
    return {
      runId,
      summary: rawContext.summary,
      files: rawContext.files.map((file) => ({
        path: file.path,
        purpose: file.purpose,
        checksum: file.checksum,
      })),
      diffs: rawContext.diffs.map((diff) => ({
        path: diff.path,
        summary: diff.summary,
      })),
      logs: rawContext.logs.map((log) => ({
        path: log.path,
        source: log.source,
        capturedAt: log.capturedAt,
      })),
      metadata: {
        ...rawContext.metadata,
        artifactId: contextArtifact.artifactId,
        artifactPath: contextArtifact.path,
      },
    };
  }

  #extractProviderRef(
    externalRefs: ExternalRefProps[],
    provider: string,
    cwd: string,
  ): ProviderRefProps | null {
    const sessionRef = externalRefs.find((ref) => ref.scope === "session");
    if (!sessionRef) {
      return null;
    }

    return {
      provider,
      providerSessionId: sessionRef.id,
      workingDirectory: cwd,
      lastUsedAt: this.clock.nowIso(),
    };
  }
}
