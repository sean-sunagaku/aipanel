import { ComparisonEngine } from "../compare/ComparisonEngine.js";
import { ResponseNormalizer } from "../compare/ResponseNormalizer.js";
import type { NormalizedResponseLike } from "../compare/ResponseNormalizer.js";
import type {
  CitationProps,
  ExternalRefProps,
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

const DEBUG_TASKS = [
  {
    role: "planner",
    label: "root-cause",
    instruction: "Analyze the most likely root cause.",
  },
  {
    role: "reviewer",
    label: "evidence",
    instruction:
      "List the strongest evidence, logs, or code paths supporting the diagnosis.",
  },
  {
    role: "validator",
    label: "fix-plan",
    instruction:
      "Propose the safest next steps or fixes and call out regression risks.",
  },
] as const;

export interface DebugResult {
  kind: "debug";
  sessionId: string;
  runId: string;
  provider: string;
  model: string;
  summary: string;
  details: string[];
  status: "completed" | "partial";
}

/**
 * Debug のユースケースを組み立てて実行する。
 * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
 */
export class DebugUseCase {
  readonly sessionManager: SessionManager;
  readonly runCoordinator: RunCoordinator;
  readonly providerRegistry: ProviderRegistry;
  readonly contextCollector: ContextCollector;
  readonly artifactRepository: ArtifactRepository;
  readonly responseNormalizer: ResponseNormalizer;
  readonly comparisonEngine: ComparisonEngine;
  readonly clock: typeof systemClock;

  constructor({
    sessionManager,
    runCoordinator,
    providerRegistry,
    contextCollector,
    artifactRepository,
    responseNormalizer = new ResponseNormalizer(),
    comparisonEngine = new ComparisonEngine(),
    clock = systemClock,
  }: {
    sessionManager: SessionManager;
    runCoordinator: RunCoordinator;
    providerRegistry: ProviderRegistry;
    contextCollector: ContextCollector;
    artifactRepository: ArtifactRepository;
    responseNormalizer?: ResponseNormalizer;
    comparisonEngine?: ComparisonEngine;
    clock?: typeof systemClock;
  }) {
    this.sessionManager = sessionManager;
    this.runCoordinator = runCoordinator;
    this.providerRegistry = providerRegistry;
    this.contextCollector = contextCollector;
    this.artifactRepository = artifactRepository;
    this.responseNormalizer = responseNormalizer;
    this.comparisonEngine = comparisonEngine;
    this.clock = clock;
  }

  /**
   * execute を担当する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param options この宣言に必要なオプション。
   * @returns DebugResult を解決する Promise。
   * @remarks 入力条件ごとの差分をここで吸収しているため、分岐を削るときは呼び出し側へ責務を漏らさないか確認する。
   */
  async execute({
    question,
    sessionId,
    title,
    files = [],
    diffs = [],
    logs = [],
    providerName,
    model,
    timeoutMs,
    cwd,
  }: {
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
  }): Promise<DebugResult> {
    const requestedModel = model;
    const session = await this.sessionManager.startOrResume({
      title: title ?? `Debug: ${question.slice(0, 60)}`,
      ...(sessionId ? { sessionId } : {}),
    });
    await this.sessionManager.appendUserTurn(session, question);

    const run = await this.runCoordinator.createRun({
      sessionId: session.sessionId,
      command: "debug",
      mode: "orchestrated",
    });

    const rawContext = await this.contextCollector.collect({
      question,
      cwd,
      ...(files.length > 0 ? { files } : {}),
      ...(diffs.length > 0 ? { diffs } : {}),
      ...(logs.length > 0 ? { logs } : {}),
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

    const adapter = this.providerRegistry.get(providerName);
    const contextText = this.contextCollector.formatForPrompt(rawContext);
    const normalizedResponses: NormalizedResponseLike[] = [];
    const details: string[] = [];
    let resolvedModel = requestedModel ?? "configured-default";
    let hasError = false;

    for (const taskSpec of DEBUG_TASKS) {
      const prompt = [
        "You are an AI coding assistant running under aipanel debug orchestrated mode.",
        `Task focus: ${taskSpec.instruction}`,
        contextText ? `Context:\n${contextText}` : "",
        `Debug question:\n${question}`,
        "Reply concisely with findings, evidence, and actionable next steps when relevant.",
      ]
        .filter(Boolean)
        .join("\n\n");

      const task = this.runCoordinator.createTask(run, {
        taskKind: "provider-review",
        role: taskSpec.role,
        provider: providerName,
        dependsOn: [],
        status: "queued",
        input: { prompt, label: taskSpec.label },
      });
      task.transition("running", this.clock.nowIso());
      run.transition("running", this.clock.nowIso());
      await this.runCoordinator.save(run);

      const providerCall: AdapterCallResult = await adapter.call({
        provider: providerName,
        prompt,
        cwd,
        timeoutMs,
        ...(requestedModel !== undefined ? { model: requestedModel } : {}),
      });
      resolvedModel = providerCall.model;
      hasError ||= providerCall.isError ?? false;

      const jsonArtifact = await this.artifactRepository.writeJsonArtifact({
        runId: run.runId,
        sessionId: session.sessionId,
        kind: "debug-task-output-json",
        content: providerCall.rawJson ?? { rawText: providerCall.rawText },
      });
      const textArtifact = await this.artifactRepository.writeTextArtifact({
        runId: run.runId,
        sessionId: session.sessionId,
        kind: "debug-task-output-text",
        content: providerCall.rawText,
        extension: ".txt",
        mimeType: "text/plain",
      });

      this.runCoordinator.createProviderResponse(run, {
        taskId: task.taskId,
        provider: providerName,
        model: providerCall.model,
        rawTextRef: textArtifact.path,
        rawJsonRef: jsonArtifact.path,
        usage: providerCall.usage ?? null,
        latencyMs: providerCall.usage?.latencyMs ?? null,
        externalRefs: providerCall.externalRefs ?? [],
      });

      const normalized = this.responseNormalizer.normalize({
        taskId: task.taskId,
        providerResponse: {
          provider: providerName,
          rawText: providerCall.rawText,
          citations: providerCall.citations ?? [],
          isError: providerCall.isError ?? false,
        },
      });
      this.runCoordinator.createNormalizedResponse(run, {
        taskId: task.taskId,
        provider: providerName,
        summary: normalized.summary,
        findings: normalized.findings,
        suggestions: normalized.suggestions,
        citations: normalized.citations,
        confidence: normalized.confidence,
      });
      normalizedResponses.push(normalized);

      this.runCoordinator.createTaskResult(run, {
        taskId: task.taskId,
        summary: normalized.summary || providerCall.rawText,
        findings: normalized.findings,
        citations: normalized.citations,
        confidence: normalized.confidence,
        sourceArtifactIds: [jsonArtifact.artifactId, textArtifact.artifactId],
      });
      task.transition(
        providerCall.isError ? "failed" : "completed",
        this.clock.nowIso(),
      );
      await this.runCoordinator.save(run);

      details.push(`[${taskSpec.label}] ${providerCall.rawText}`);
    }

    const reportDraft = this.comparisonEngine.compare(
      question,
      normalizedResponses,
    );
    this.runCoordinator.createComparisonReport(run, {
      topic: question,
      responseIds: reportDraft.responseIds,
      agreements: reportDraft.agreements,
      differences: reportDraft.differences,
      recommendation: reportDraft.recommendation,
    });

    const recommendation =
      reportDraft.recommendation ?? "No recommendation available.";
    run.finalSummary = recommendation;
    run.validationStatus = hasError ? "needs-review" : "validated";
    run.transition(hasError ? "partial" : "completed", this.clock.nowIso());
    await this.runCoordinator.save(run);

    await this.sessionManager.appendAssistantTurn(
      session,
      details.join("\n\n"),
    );

    return {
      kind: "debug",
      sessionId: session.sessionId,
      runId: run.runId,
      provider: providerName,
      model: resolvedModel,
      summary: recommendation,
      details,
      status: hasError ? "partial" : "completed",
    };
  }

  /**
   * #to Context Bundle Props を担当する。
   * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
   *
   * @param runId 対象を識別する ID。
   * @param rawContext 処理に渡す raw Context。
   * @param contextArtifact 処理に渡す context Artifact。
   * @returns 処理結果。
   */
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
}
