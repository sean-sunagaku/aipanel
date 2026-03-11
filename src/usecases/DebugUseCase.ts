/**
 * Debug Use Case を定義する。
 * このファイルは、planner / reviewer / validator を使う debug orchestrated flow を実行手順としてまとめ、run ledger への記録を一貫させるために存在する。
 */

import { ComparisonEngine } from "../compare/ComparisonEngine.js";
import { ResponseNormalizer } from "../compare/ResponseNormalizer.js";
import type { NormalizedResponseLike } from "../compare/ResponseNormalizer.js";
import type { CitationProps, UsageProps } from "../domain/value-objects.js";
import type { ProviderName } from "../shared/commands.js";
import type { ContextCollector } from "../context/ContextCollector.js";
import type { ArtifactRepository } from "../artifact/ArtifactRepository.js";
import type { ProviderRegistry } from "../providers/ProviderRegistry.js";
import type { ProviderCallResult } from "../providers/ProviderAdapter.js";
import type { RunCoordinator } from "../run/RunCoordinator.js";
import type { SessionManager } from "../session/SessionManager.js";
import { systemClock } from "../shared/clock.js";
import { match } from "ts-pattern";
import type {
  RunResultStatus,
  RunReviewStatus,
  RunStatus,
  TaskStatus,
} from "../domain/run.js";

type AdapterCallResult = ProviderCallResult & {
  usage?: UsageProps | null;
  citations?: CitationProps[];
};

type DebugTaskSpec = {
  role: "planner" | "reviewer" | "validator";
  label: string;
  instruction: string;
};

const DEBUG_TASKS: DebugTaskSpec[] = [
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
];

export interface DebugResult {
  kind: "debug";
  sessionId: string;
  runId: string;
  provider: ProviderName;
  model: string;
  summary: string;
  details: string[];
  status: RunResultStatus;
}

/**
 * Debug command の実行手順を定義する。
 * command 実行手順を use case に閉じ込め、CLI / app 層から provider 呼び出し順や state update を切り離す。
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
    providerName,
    model,
    timeoutMs,
    cwd,
  }: {
    question: string;
    sessionId?: string;
    providerName: ProviderName;
    model?: string;
    timeoutMs: number;
    cwd: string;
  }): Promise<DebugResult> {
    const requestedModel = model;
    const session = await this.sessionManager.startOrResume({
      title: `Debug: ${question.slice(0, 60)}`,
      ...(sessionId ? { sessionId } : {}),
    });
    await this.sessionManager.appendUserTurn(session, question);

    const run = await this.runCoordinator.createRun({
      sessionId: session.sessionId,
      command: "debug",
      mode: "orchestrated",
    });

    const rawContext = await this.contextCollector.collect({ question, cwd });
    const contextArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "run-context",
      content: rawContext,
    });
    this.runCoordinator.createRunContext(run, {
      summary: rawContext.summary,
      question: rawContext.question,
      cwd: rawContext.cwd,
      collectedAt: rawContext.collectedAt,
      artifactId: contextArtifact.artifactId,
      artifactPath: contextArtifact.path,
    });
    run.transition("planned", this.clock.nowIso());
    await this.runCoordinator.save(run);

    const adapter = this.providerRegistry.get(providerName);
    const normalizedResponses: NormalizedResponseLike[] = [];
    const details: string[] = [];
    let resolvedModel = requestedModel ?? "configured-default";
    let hasError = false;

    for (const taskSpec of DEBUG_TASKS) {
      const prompt = [
        "You are an AI coding assistant running under aipanel debug orchestrated mode.",
        `Task focus: ${taskSpec.instruction}`,
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
      const taskResultStatus = match(providerCall.isError)
        .returnType<TaskStatus>()
        .with(true, () => "failed")
        .otherwise(() => "completed");
      task.transition(taskResultStatus, this.clock.nowIso());
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
    const runTransition = match(hasError)
      .returnType<{
        reviewStatus: RunReviewStatus;
        transitionStatus: RunStatus;
        resultStatus: RunResultStatus;
      }>()
      .with(true, () => ({
        reviewStatus: "needs-review",
        transitionStatus: "partial",
        resultStatus: "partial",
      }))
      .otherwise(() => ({
        reviewStatus: "ready",
        transitionStatus: "completed",
        resultStatus: "completed",
      }));
    run.reviewStatus = runTransition.reviewStatus;
    run.transition(runTransition.transitionStatus, this.clock.nowIso());
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
      status: runTransition.resultStatus,
    };
  }
}
