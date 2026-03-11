/**
 * Consult Use Case を定義する。
 * このファイルは、consult と followup の direct provider flow を実行手順としてまとめ、session / run / artifact 更新順を use case で固定するために存在する。
 */

import { match } from "ts-pattern";
import { ResponseNormalizer } from "../compare/ResponseNormalizer.js";
import type { CitationProps, UsageProps } from "../domain/value-objects.js";
import type { ContextCollector } from "../context/ContextCollector.js";
import type { ProviderName } from "../shared/commands.js";
import type { ArtifactRepository } from "../artifact/ArtifactRepository.js";
import type { ProviderRegistry } from "../providers/ProviderRegistry.js";
import type { ProviderCallResult } from "../providers/ProviderAdapter.js";
import type { RunCoordinator } from "../run/RunCoordinator.js";
import type { SessionManager } from "../session/SessionManager.js";
import { systemClock } from "../shared/clock.js";
import type {
  RunResultStatus,
  RunStatus,
  RunReviewStatus,
  TaskStatus,
} from "../domain/run.js";

type AdapterCallResult = ProviderCallResult & {
  usage?: UsageProps | null;
  citations?: CitationProps[];
};

type ConsultationInputBase = {
  question: string;
  providerName: ProviderName;
  model?: string;
  timeoutMs: number;
  cwd: string;
};

export type ConsultationInput =
  | ({ command: "consult"; sessionId?: string } & ConsultationInputBase)
  | ({ command: "followup"; sessionId: string } & ConsultationInputBase);

export interface ConsultationResult {
  kind: "consultation";
  sessionId: string;
  runId: string;
  answer: string;
  provider: ProviderName;
  model: string;
  status: RunResultStatus;
  reviewStatus: RunReviewStatus;
}

/**
 * Consult command の実行手順を定義する。
 * command 実行手順を use case に閉じ込め、CLI / app 層から provider 呼び出し順や state update を切り離す。
 */
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

  /**
   * execute を担当する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param input この処理に渡す入力。
   * @returns ConsultationResult を解決する Promise。
   * @remarks 入力条件ごとの差分をここで吸収しているため、分岐を削るときは呼び出し側へ責務を漏らさないか確認する。
   */
  async execute(input: ConsultationInput): Promise<ConsultationResult> {
    const model = input.model;
    const session = await this.sessionManager.startOrResume({
      title: input.question.slice(0, 80),
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
    });
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

    const prompt = this.#buildPrompt(session.buildTranscript(), input.question);
    const taskRole = match(input.command)
      .returnType<"consult" | "followup">()
      .with("consult", () => "consult")
      .with("followup", () => "followup")
      .exhaustive();
    const task = this.runCoordinator.createTask(run, {
      taskKind: "provider-review",
      role: taskRole,
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
    const transition = match(isError)
      .returnType<{
        taskStatus: TaskStatus;
        runStatus: RunStatus;
        resultStatus: RunResultStatus;
        reviewStatus: RunReviewStatus;
      }>()
      .with(true, () => ({
        taskStatus: "failed",
        runStatus: "partial",
        resultStatus: "partial",
        reviewStatus: "needs-review",
      }))
      .with(false, () => ({
        taskStatus: "completed",
        runStatus: "completed",
        resultStatus: "completed",
        reviewStatus: "ready",
      }))
      .exhaustive();

    task.transition(transition.taskStatus, this.clock.nowIso());
    run.finalSummary = normalizedDraft.summary || adapterResult.rawText;
    run.reviewStatus = transition.reviewStatus;
    run.transition(transition.runStatus, this.clock.nowIso());
    await this.runCoordinator.save(run);

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
      status: transition.resultStatus,
      reviewStatus: run.reviewStatus ?? "ready",
    };
  }

  /**
   * #build Prompt を担当する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param transcript 処理に渡す transcript。
   * @param question ユーザーから渡された質問内容。
   * @returns 生成または整形した文字列。
   */
  #buildPrompt(transcript: string, question: string): string {
    const sections = [
      "You are an AI coding assistant running under aipanel.",
      transcript ? `Conversation so far:\n${transcript}` : "",
      `Current question:\n${question}`,
      "Reply with a direct, practical answer. If there are risks or assumptions, state them explicitly.",
    ].filter(Boolean);

    return sections.join("\n\n");
  }
}
