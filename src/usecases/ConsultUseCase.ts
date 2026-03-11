/**
 * Consult Use Case を定義する。
 * このファイルは、consult と followup の direct provider flow を実行手順としてまとめ、session / run / artifact 更新順を use case で固定するために存在する。
 */

import { match } from "ts-pattern";
import { ResponseNormalizer } from "../compare/ResponseNormalizer.js";
import type { ContextCollector } from "../context/ContextCollector.js";
import type {
  Run,
  RunResultStatus,
  RunReviewStatus,
  RunStatus,
  RunTask,
  TaskStatus,
} from "../domain/run.js";
import type { Session } from "../domain/session.js";
import type { CitationProps, UsageProps } from "../domain/value-objects.js";
import type { ArtifactRepository } from "../artifact/ArtifactRepository.js";
import type { ProviderCallResult } from "../providers/ProviderAdapter.js";
import type { ProviderRegistry } from "../providers/ProviderRegistry.js";
import type { RunCoordinator } from "../run/RunCoordinator.js";
import type { SessionManager } from "../session/SessionManager.js";
import { systemClock } from "../shared/clock.js";
import type { ProviderSpec } from "../shared/commands.js";
import {
  deriveBatchReviewStatus,
  deriveBatchStatus,
  type BatchPayload,
  type BatchResult,
  type ConsultationBatchOutput,
} from "../shared/cli-contract.js";

type AdapterCallResult = ProviderCallResult & {
  usage?: UsageProps | null;
  citations?: CitationProps[];
};

type ConsultationInputBase = {
  question: string;
  providers: readonly ProviderSpec[];
  timeoutMs: number;
  cwd: string;
};

type ReviewerExecution = {
  provider: ProviderSpec;
  session: Session;
  prompt: string;
  task: RunTask;
};

export type ConsultationInput =
  | ({ command: "consult"; sessionId?: string } & ConsultationInputBase)
  | ({ command: "followup"; sessionId: string } & ConsultationInputBase);

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
   * @returns BatchPayload<ConsultationBatchOutput> を解決する Promise。
   * @throws provider が空、または followup に複数 provider が渡された場合。
   * @remarks 入力条件ごとの差分をここで吸収しているため、分岐を削るときは呼び出し側へ責務を漏らさないか確認する。
   */
  async execute(
    input: ConsultationInput,
  ): Promise<BatchPayload<ConsultationBatchOutput>> {
    if (input.providers.length === 0) {
      throw new Error("At least one provider is required.");
    }

    if (input.command === "followup" && input.providers.length !== 1) {
      throw new Error("`followup` requires exactly one provider.");
    }

    const reviewerSessions = await Promise.all(
      input.providers.map(async (provider) => {
        const session = await this.sessionManager.startOrResume({
          title: input.question.slice(0, 80),
          ...(input.command === "followup"
            ? { sessionId: input.sessionId }
            : {}),
        });
        await this.sessionManager.appendUserTurn(session, input.question);
        return {
          provider,
          session,
          prompt: this.#buildPrompt(session.buildTranscript(), input.question),
        };
      }),
    );

    const singleReviewerSession =
      reviewerSessions.length === 1 ? reviewerSessions[0] : undefined;

    const run = await this.runCoordinator.createRun({
      ...(singleReviewerSession !== undefined
        ? { sessionId: singleReviewerSession.session.sessionId }
        : {}),
      command: input.command,
      mode: reviewerSessions.length === 1 ? "direct" : "orchestrated",
    });

    const rawContext = await this.contextCollector.collect({
      question: input.question,
      cwd: input.cwd,
    });
    const contextArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      ...(singleReviewerSession !== undefined
        ? { sessionId: singleReviewerSession.session.sessionId }
        : {}),
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

    const taskRole = match(input.command)
      .returnType<"consult" | "followup">()
      .with("consult", () => "consult")
      .with("followup", () => "followup")
      .exhaustive();
    const reviewerExecutions = reviewerSessions.map(
      (reviewerSession, index) => {
        const task = this.runCoordinator.createTask(run, {
          taskKind: "provider-review",
          role: taskRole,
          provider: reviewerSession.provider.name,
          dependsOn: [],
          status: "queued",
          input: {
            prompt: reviewerSession.prompt,
            provider: reviewerSession.provider.name,
            reviewerOrder: index + 1,
          },
        });
        task.transition("running", this.clock.nowIso());
        return {
          ...reviewerSession,
          task,
        };
      },
    );
    run.transition("running", this.clock.nowIso());
    await this.runCoordinator.save(run);

    const settledCalls = await Promise.allSettled(
      reviewerExecutions.map(async (reviewerExecution) => {
        const adapter = this.providerRegistry.get(
          reviewerExecution.provider.name,
        );
        const adapterResult: AdapterCallResult = await adapter.call({
          provider: reviewerExecution.provider.name,
          prompt: reviewerExecution.prompt,
          cwd: input.cwd,
          timeoutMs: input.timeoutMs,
          ...(reviewerExecution.provider.model !== undefined
            ? { model: reviewerExecution.provider.model }
            : {}),
        });
        return {
          reviewerExecution,
          adapterResult,
        };
      }),
    );

    const results: BatchResult<ConsultationBatchOutput>[] = [];

    for (const [index, settledCall] of settledCalls.entries()) {
      const reviewerExecution = reviewerExecutions[index];
      if (!reviewerExecution) {
        continue;
      }

      const result = await match(settledCall)
        .returnType<Promise<BatchResult<ConsultationBatchOutput>>>()
        .with({ status: "fulfilled" }, async ({ value }) =>
          this.#recordConsultationSuccess(
            run,
            value.reviewerExecution,
            value.adapterResult,
          ),
        )
        .with({ status: "rejected" }, async ({ reason }) =>
          this.#recordConsultationFailure(run, reviewerExecution, reason),
        )
        .exhaustive();

      results.push(result);
      await this.runCoordinator.save(run);
    }

    run.finalSummary = this.#buildBatchSummary(results);
    run.reviewStatus = deriveBatchReviewStatus(results) ?? null;
    run.transition(
      this.#toRunStatus(deriveBatchStatus(results)),
      this.clock.nowIso(),
    );
    await this.runCoordinator.save(run);

    return {
      kind: "batch",
      command: input.command,
      runId: run.runId,
      status: deriveBatchStatus(results),
      ...(run.reviewStatus ? { reviewStatus: run.reviewStatus } : {}),
      results,
    };
  }

  /**
   * 成功した consultation provider call を ledger と batch result へ反映する。
   * artifact 保存、normalized response 作成、session 追記をこの helper に閉じ込め、成功系の記録順を固定する。
   *
   * @param run 更新対象の run。
   * @param reviewerExecution 実行中 reviewer の文脈。
   * @param adapterResult provider から返った生結果。
   * @returns 成功時の batch result。
   */
  async #recordConsultationSuccess(
    run: Run,
    reviewerExecution: ReviewerExecution,
    adapterResult: AdapterCallResult,
  ): Promise<BatchResult<ConsultationBatchOutput>> {
    const rawJsonArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      sessionId: reviewerExecution.session.sessionId,
      kind: "provider-response-json",
      content: adapterResult.rawJson ?? { rawText: adapterResult.rawText },
    });
    const rawTextArtifact = await this.artifactRepository.writeTextArtifact({
      runId: run.runId,
      sessionId: reviewerExecution.session.sessionId,
      kind: "provider-response-text",
      content: adapterResult.rawText,
      extension: ".txt",
      mimeType: "text/plain",
    });

    this.runCoordinator.createProviderResponse(run, {
      taskId: reviewerExecution.task.taskId,
      provider: adapterResult.provider,
      rawTextRef: rawTextArtifact.path,
      rawJsonRef: rawJsonArtifact.path,
      usage: adapterResult.usage ?? null,
      latencyMs: adapterResult.usage?.latencyMs ?? null,
    });

    const normalizedDraft = this.responseNormalizer.normalize({
      taskId: reviewerExecution.task.taskId,
      providerResponse: {
        provider: adapterResult.provider,
        rawText: adapterResult.rawText,
        citations: adapterResult.citations ?? [],
        isError: adapterResult.isError ?? false,
      },
    });
    this.runCoordinator.createNormalizedResponse(run, {
      taskId: reviewerExecution.task.taskId,
      provider: adapterResult.provider,
      summary: normalizedDraft.summary,
      findings: normalizedDraft.findings,
      suggestions: normalizedDraft.suggestions,
      citations: normalizedDraft.citations,
      confidence: normalizedDraft.confidence,
    });
    this.runCoordinator.createTaskResult(run, {
      taskId: reviewerExecution.task.taskId,
      summary: normalizedDraft.summary || adapterResult.rawText,
      findings: normalizedDraft.findings,
      citations: normalizedDraft.citations,
      confidence: normalizedDraft.confidence,
      sourceArtifactIds: [
        rawJsonArtifact.artifactId,
        rawTextArtifact.artifactId,
      ],
    });

    const transition = this.#deriveConsultationTransition(
      adapterResult.isError ?? false,
    );
    reviewerExecution.task.transition(
      transition.taskStatus,
      this.clock.nowIso(),
    );

    await this.sessionManager.appendAssistantTurn(
      reviewerExecution.session,
      adapterResult.rawText,
      [rawJsonArtifact.artifactId, rawTextArtifact.artifactId],
    );

    return {
      provider: adapterResult.provider,
      sessionId: reviewerExecution.session.sessionId,
      status: transition.resultStatus,
      reviewStatus: transition.reviewStatus,
      ...(transition.reviewStatus === "needs-review"
        ? { errorMessage: adapterResult.rawText }
        : {}),
      output: {
        kind: "consultation",
        answer: adapterResult.rawText,
      },
    };
  }

  /**
   * 失敗した consultation provider call を ledger と batch result へ反映する。
   * 失敗時も artifact と normalized error を残し、partial batch response を一貫した形で返せるようにする。
   *
   * @param run 更新対象の run。
   * @param reviewerExecution 実行中 reviewer の文脈。
   * @param reason 例外または失敗理由。
   * @returns 失敗時の batch result。
   */
  async #recordConsultationFailure(
    run: Run,
    reviewerExecution: ReviewerExecution,
    reason: unknown,
  ): Promise<BatchResult<ConsultationBatchOutput>> {
    const message = reason instanceof Error ? reason.message : String(reason);
    const rawJsonArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      sessionId: reviewerExecution.session.sessionId,
      kind: "provider-response-json",
      content: { error: message },
    });
    const rawTextArtifact = await this.artifactRepository.writeTextArtifact({
      runId: run.runId,
      sessionId: reviewerExecution.session.sessionId,
      kind: "provider-response-text",
      content: message,
      extension: ".txt",
      mimeType: "text/plain",
    });

    this.runCoordinator.createProviderResponse(run, {
      taskId: reviewerExecution.task.taskId,
      provider: reviewerExecution.provider.name,
      rawTextRef: rawTextArtifact.path,
      rawJsonRef: rawJsonArtifact.path,
      usage: null,
      latencyMs: null,
    });

    const normalizedDraft = this.responseNormalizer.normalize({
      taskId: reviewerExecution.task.taskId,
      providerResponse: {
        provider: reviewerExecution.provider.name,
        rawText: message,
        citations: [],
        isError: true,
      },
    });
    this.runCoordinator.createNormalizedResponse(run, {
      taskId: reviewerExecution.task.taskId,
      provider: reviewerExecution.provider.name,
      summary: normalizedDraft.summary,
      findings: normalizedDraft.findings,
      suggestions: normalizedDraft.suggestions,
      citations: normalizedDraft.citations,
      confidence: normalizedDraft.confidence,
    });
    this.runCoordinator.createTaskResult(run, {
      taskId: reviewerExecution.task.taskId,
      summary: normalizedDraft.summary || message,
      findings: normalizedDraft.findings,
      citations: normalizedDraft.citations,
      confidence: normalizedDraft.confidence,
      sourceArtifactIds: [
        rawJsonArtifact.artifactId,
        rawTextArtifact.artifactId,
      ],
    });

    reviewerExecution.task.transition("failed", this.clock.nowIso());
    await this.sessionManager.appendAssistantTurn(
      reviewerExecution.session,
      message,
      [rawJsonArtifact.artifactId, rawTextArtifact.artifactId],
    );

    return {
      provider: reviewerExecution.provider.name,
      sessionId: reviewerExecution.session.sessionId,
      status: "partial",
      reviewStatus: "needs-review",
      errorMessage: message,
      output: {
        kind: "consultation",
        answer: "",
      },
    };
  }

  /**
   * provider call の error 状態から task/run/result 遷移を決める。
   * consultation 成否の状態変換を一箇所へ寄せ、成功系と失敗系で同じ mapping を使えるようにする。
   *
   * @param isError provider call が error 扱いかどうか。
   * @returns task/run/result/review の遷移先。
   */
  #deriveConsultationTransition(isError: boolean): {
    taskStatus: TaskStatus;
    runStatus: RunStatus;
    resultStatus: RunResultStatus;
    reviewStatus: RunReviewStatus;
  } {
    return match(isError)
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
  }

  /**
   * batch result status を run status へ変換する。
   * CLI 向けの result status と run ledger の status 名を同じ意味で接続し、集約後の保存先を単純に保つ。
   *
   * @param resultStatus 集約済み result status。
   * @returns run ledger に保存する status。
   */
  #toRunStatus(resultStatus: RunResultStatus): RunStatus {
    return match(resultStatus)
      .returnType<RunStatus>()
      .with("completed", () => "completed")
      .with("partial", () => "partial")
      .exhaustive();
  }

  /**
   * consultation batch 全体の summary を作る。
   * provider ごとの回答を run final summary へ圧縮し、後続の ledger 参照で全体像を追いやすくする。
   *
   * @param results 集約対象の batch result 一覧。
   * @returns run summary。
   */
  #buildBatchSummary(
    results: readonly BatchResult<ConsultationBatchOutput>[],
  ): string {
    const summaries = results
      .map((result) => {
        const answer = result.output.answer.trim();
        return answer ? `${result.provider}: ${answer}` : "";
      })
      .filter((value) => value.length > 0);

    if (summaries.length === 0) {
      return "No answer available.";
    }

    return summaries.join("\n\n");
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
