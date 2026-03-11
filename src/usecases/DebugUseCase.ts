/**
 * Debug Use Case を定義する。
 * このファイルは、planner / reviewer / validator を使う debug orchestrated flow を実行手順としてまとめ、run ledger への記録を一貫させるために存在する。
 */

import { ComparisonEngine } from "../compare/ComparisonEngine.js";
import { ResponseNormalizer } from "../compare/ResponseNormalizer.js";
import type { NormalizedResponseLike } from "../compare/ResponseNormalizer.js";
import type { ContextCollector } from "../context/ContextCollector.js";
import type {
  Run,
  RunResultStatus,
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
import type { ProviderName, ProviderSpec } from "../shared/commands.js";
import {
  deriveBatchReviewStatus,
  deriveBatchStatus,
  type BatchPayload,
  type BatchResult,
  type DebugBatchOutput,
} from "../shared/cli-contract.js";
import { match } from "ts-pattern";

type AdapterCallResult = ProviderCallResult & {
  usage?: UsageProps | null;
  citations?: CitationProps[];
};

type DebugTaskSpec = {
  role: "planner" | "reviewer" | "validator";
  label: string;
  instruction: string;
};

type DebugInput = {
  question: string;
  providers: readonly ProviderSpec[];
  timeoutMs: number;
  cwd: string;
};

type DebugTaskExecution = {
  spec: DebugTaskSpec;
  task: RunTask;
  prompt: string;
};

type ProviderDebugExecution = {
  provider: ProviderSpec;
  session: Session;
  taskExecutions: readonly DebugTaskExecution[];
};

type ProviderDebugStep =
  | {
      kind: "fulfilled";
      taskExecution: DebugTaskExecution;
      adapterResult: AdapterCallResult;
    }
  | {
      kind: "rejected";
      taskExecution: DebugTaskExecution;
      reason: unknown;
    }
  | {
      kind: "skipped";
      taskExecution: DebugTaskExecution;
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
   * @param input この処理に渡す入力。
   * @returns BatchPayload<DebugBatchOutput> を解決する Promise。
   * @throws provider が 1 件も指定されていない場合。
   * @remarks 入力条件ごとの差分をここで吸収しているため、分岐を削るときは呼び出し側へ責務を漏らさないか確認する。
   */
  async execute(input: DebugInput): Promise<BatchPayload<DebugBatchOutput>> {
    if (input.providers.length === 0) {
      throw new Error("At least one provider is required.");
    }

    const providerSessions = await Promise.all(
      input.providers.map(async (provider) => {
        const session = await this.sessionManager.startOrResume({
          title: `Debug: ${input.question.slice(0, 60)}`,
        });
        await this.sessionManager.appendUserTurn(session, input.question);
        return {
          provider,
          session,
        };
      }),
    );

    const singleProviderSession =
      providerSessions.length === 1 ? providerSessions[0] : undefined;

    const run = await this.runCoordinator.createRun({
      ...(singleProviderSession !== undefined
        ? { sessionId: singleProviderSession.session.sessionId }
        : {}),
      command: "debug",
      mode: "orchestrated",
    });

    const rawContext = await this.contextCollector.collect({
      question: input.question,
      cwd: input.cwd,
    });
    const contextArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      ...(singleProviderSession !== undefined
        ? { sessionId: singleProviderSession.session.sessionId }
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

    const providerExecutions = providerSessions.map(
      (providerSession, index) => {
        const taskExecutions = DEBUG_TASKS.map((taskSpec) => {
          const prompt = [
            "You are an AI coding assistant running under aipanel debug orchestrated mode.",
            `Task focus: ${taskSpec.instruction}`,
            `Debug question:\n${input.question}`,
            "Reply concisely with findings, evidence, and actionable next steps when relevant.",
          ]
            .filter(Boolean)
            .join("\n\n");

          const task = this.runCoordinator.createTask(run, {
            taskKind: "provider-review",
            role: taskSpec.role,
            provider: providerSession.provider.name,
            dependsOn: [],
            status: "queued",
            input: {
              prompt,
              label: taskSpec.label,
              reviewerOrder: index + 1,
            },
          });
          task.transition("running", this.clock.nowIso());

          return {
            spec: taskSpec,
            task,
            prompt,
          };
        });

        return {
          ...providerSession,
          taskExecutions,
        };
      },
    );

    run.transition("running", this.clock.nowIso());
    await this.runCoordinator.save(run);

    const providerSteps = await Promise.all(
      providerExecutions.map((providerExecution) =>
        this.#executeProviderSteps(providerExecution, input),
      ),
    );

    const results: BatchResult<DebugBatchOutput>[] = [];

    for (const providerStep of providerSteps) {
      const result = await this.#recordProviderSteps(
        run,
        input.question,
        providerStep,
      );
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
      command: "debug",
      runId: run.runId,
      status: deriveBatchStatus(results),
      ...(run.reviewStatus ? { reviewStatus: run.reviewStatus } : {}),
      results,
    };
  }

  /**
   * 単一 provider の planner/reviewer/validator call を順に実行する。
   * provider 内の 3 段フローを順序付きで保ちつつ、provider 間だけ並列化できるようにする。
   *
   * @param providerExecution 対象 provider の実行文脈。
   * @param input debug 入力。
   * @returns 実行結果と step 一覧。
   * @remarks どこかで失敗した provider は後続 step を skipped にし、planner/reviewer/validator の順序前提を崩さない。
   */
  async #executeProviderSteps(
    providerExecution: ProviderDebugExecution,
    input: DebugInput,
  ): Promise<{
    providerExecution: ProviderDebugExecution;
    steps: readonly ProviderDebugStep[];
  }> {
    const adapter = this.providerRegistry.get(providerExecution.provider.name);
    const steps: ProviderDebugStep[] = [];
    let hasFailure = false;

    for (const taskExecution of providerExecution.taskExecutions) {
      if (hasFailure) {
        steps.push({
          kind: "skipped",
          taskExecution,
        });
        continue;
      }

      try {
        const adapterResult: AdapterCallResult = await adapter.call({
          provider: providerExecution.provider.name,
          prompt: taskExecution.prompt,
          cwd: input.cwd,
          timeoutMs: input.timeoutMs,
          ...(providerExecution.provider.model !== undefined
            ? { model: providerExecution.provider.model }
            : {}),
        });
        steps.push({
          kind: "fulfilled",
          taskExecution,
          adapterResult,
        });
      } catch (reason) {
        hasFailure = true;
        steps.push({
          kind: "rejected",
          taskExecution,
          reason,
        });
      }
    }

    return {
      providerExecution,
      steps,
    };
  }

  /**
   * provider 単位の debug steps を ledger と batch result へ反映する。
   * task ごとの成功・失敗・skip をまとめて記録し、comparison report と final batch result を組み立てる。
   *
   * @param run 更新対象の run。
   * @param question debug 対象の質問。
   * @param providerStep provider 単位の step 実行結果。
   * @returns provider 単位の batch result。
   * @remarks skipped step も ledger に残し、partial failure 時にどこで流れが止まったかを run 記録と caller の両方から追えるようにする。
   */
  async #recordProviderSteps(
    run: Run,
    question: string,
    providerStep: {
      providerExecution: ProviderDebugExecution;
      steps: readonly ProviderDebugStep[];
    },
  ): Promise<BatchResult<DebugBatchOutput>> {
    const normalizedResponses: NormalizedResponseLike[] = [];
    const details: string[] = [];
    let hasError = false;
    let errorMessage: string | undefined;

    for (const step of providerStep.steps) {
      await match(step)
        .returnType<Promise<void>>()
        .with(
          { kind: "fulfilled" },
          async ({ taskExecution, adapterResult }) => {
            const recorded = await this.#recordDebugTaskSuccess(
              run,
              providerStep.providerExecution.session,
              providerStep.providerExecution.provider.name,
              taskExecution,
              adapterResult,
            );
            details.push(recorded.detail);
            normalizedResponses.push(recorded.normalized);
            hasError ||= adapterResult.isError ?? false;
            if (
              (adapterResult.isError ?? false) &&
              errorMessage === undefined
            ) {
              errorMessage = adapterResult.rawText;
            }
          },
        )
        .with({ kind: "rejected" }, async ({ taskExecution, reason }) => {
          hasError = true;
          const recorded = await this.#recordDebugTaskFailure(
            run,
            providerStep.providerExecution.session,
            providerStep.providerExecution.provider.name,
            taskExecution,
            reason,
          );
          details.push(recorded.detail);
          errorMessage ??= recorded.message;
        })
        .with({ kind: "skipped" }, async ({ taskExecution }) => {
          hasError = true;
          taskExecution.task.transition("skipped", this.clock.nowIso());
          details.push(
            `[${taskExecution.spec.label}] skipped after an earlier provider failure.`,
          );
        })
        .exhaustive();
    }

    const reportDraft = this.comparisonEngine.compare(
      question,
      normalizedResponses,
    );
    this.runCoordinator.createComparisonReport(run, {
      topic: `${question} (${providerStep.providerExecution.provider.name})`,
      responseIds: reportDraft.responseIds,
      agreements: reportDraft.agreements,
      differences: reportDraft.differences,
      recommendation: reportDraft.recommendation,
    });

    const summary =
      reportDraft.recommendation ?? "No recommendation available.";
    await this.sessionManager.appendAssistantTurn(
      providerStep.providerExecution.session,
      details.join("\n\n"),
    );

    return {
      provider: providerStep.providerExecution.provider.name,
      sessionId: providerStep.providerExecution.session.sessionId,
      status: hasError ? "partial" : "completed",
      reviewStatus: hasError ? "needs-review" : "ready",
      ...(errorMessage ? { errorMessage } : {}),
      output: {
        kind: "debug",
        summary,
        details,
      },
    };
  }

  /**
   * 成功した debug task を ledger へ反映する。
   * raw artifact、normalized response、task result をまとめて作り、task 単位の成功記録を一貫させる。
   *
   * @param run 更新対象の run。
   * @param session provider session。
   * @param providerName 対象 provider。
   * @param taskExecution 対象 task。
   * @param adapterResult provider から返った生結果。
   * @returns 表示 detail と normalized response。
   */
  async #recordDebugTaskSuccess(
    run: Run,
    session: Session,
    providerName: ProviderName,
    taskExecution: DebugTaskExecution,
    adapterResult: AdapterCallResult,
  ): Promise<{
    detail: string;
    normalized: NormalizedResponseLike;
  }> {
    const jsonArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "debug-task-output-json",
      content: adapterResult.rawJson ?? { rawText: adapterResult.rawText },
    });
    const textArtifact = await this.artifactRepository.writeTextArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "debug-task-output-text",
      content: adapterResult.rawText,
      extension: ".txt",
      mimeType: "text/plain",
    });

    this.runCoordinator.createProviderResponse(run, {
      taskId: taskExecution.task.taskId,
      provider: providerName,
      rawTextRef: textArtifact.path,
      rawJsonRef: jsonArtifact.path,
      usage: adapterResult.usage ?? null,
      latencyMs: adapterResult.usage?.latencyMs ?? null,
    });

    const normalized = this.responseNormalizer.normalize({
      taskId: taskExecution.task.taskId,
      providerResponse: {
        provider: providerName,
        rawText: adapterResult.rawText,
        citations: adapterResult.citations ?? [],
        isError: adapterResult.isError ?? false,
      },
    });
    this.runCoordinator.createNormalizedResponse(run, {
      taskId: taskExecution.task.taskId,
      provider: providerName,
      summary: normalized.summary,
      findings: normalized.findings,
      suggestions: normalized.suggestions,
      citations: normalized.citations,
      confidence: normalized.confidence,
    });
    this.runCoordinator.createTaskResult(run, {
      taskId: taskExecution.task.taskId,
      summary: normalized.summary || adapterResult.rawText,
      findings: normalized.findings,
      citations: normalized.citations,
      confidence: normalized.confidence,
      sourceArtifactIds: [jsonArtifact.artifactId, textArtifact.artifactId],
    });

    const taskStatus = match(adapterResult.isError)
      .returnType<TaskStatus>()
      .with(true, () => "failed")
      .otherwise(() => "completed");
    taskExecution.task.transition(taskStatus, this.clock.nowIso());

    return {
      detail: `[${taskExecution.spec.label}] ${adapterResult.rawText}`,
      normalized,
    };
  }

  /**
   * 失敗した debug task を ledger へ反映する。
   * 例外を artifact と normalized error に変換し、後続の comparison 前でも失敗理由を追跡できるようにする。
   *
   * @param run 更新対象の run。
   * @param session provider session。
   * @param providerName 対象 provider。
   * @param taskExecution 対象 task。
   * @param reason 例外または失敗理由。
   * @returns 表示 detail と失敗 message。
   */
  async #recordDebugTaskFailure(
    run: Run,
    session: Session,
    providerName: ProviderName,
    taskExecution: DebugTaskExecution,
    reason: unknown,
  ): Promise<{
    detail: string;
    message: string;
  }> {
    const message = reason instanceof Error ? reason.message : String(reason);
    const jsonArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "debug-task-output-json",
      content: { error: message },
    });
    const textArtifact = await this.artifactRepository.writeTextArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "debug-task-output-text",
      content: message,
      extension: ".txt",
      mimeType: "text/plain",
    });

    this.runCoordinator.createProviderResponse(run, {
      taskId: taskExecution.task.taskId,
      provider: providerName,
      rawTextRef: textArtifact.path,
      rawJsonRef: jsonArtifact.path,
      usage: null,
      latencyMs: null,
    });

    const normalized = this.responseNormalizer.normalize({
      taskId: taskExecution.task.taskId,
      providerResponse: {
        provider: providerName,
        rawText: message,
        citations: [],
        isError: true,
      },
    });
    this.runCoordinator.createNormalizedResponse(run, {
      taskId: taskExecution.task.taskId,
      provider: providerName,
      summary: normalized.summary,
      findings: normalized.findings,
      suggestions: normalized.suggestions,
      citations: normalized.citations,
      confidence: normalized.confidence,
    });
    this.runCoordinator.createTaskResult(run, {
      taskId: taskExecution.task.taskId,
      summary: normalized.summary || message,
      findings: normalized.findings,
      citations: normalized.citations,
      confidence: normalized.confidence,
      sourceArtifactIds: [jsonArtifact.artifactId, textArtifact.artifactId],
    });

    taskExecution.task.transition("failed", this.clock.nowIso());

    return {
      detail: `[${taskExecution.spec.label}] ${message}`,
      message,
    };
  }

  /**
   * batch result status を run status へ変換する。
   * debug batch の集約結果を run ledger の status 名へ写し替え、保存時の分岐を増やさないようにする。
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
   * debug batch 全体の summary を作る。
   * provider ごとの recommendation を連結し、run final summary から全 reviewer の結論を追えるようにする。
   *
   * @param results 集約対象の batch result 一覧。
   * @returns run summary。
   */
  #buildBatchSummary(
    results: readonly BatchResult<DebugBatchOutput>[],
  ): string {
    const summaries = results
      .map((result) => `${result.provider}: ${result.output.summary}`.trim())
      .filter((value) => value.length > 0);

    if (summaries.length === 0) {
      return "No recommendation available.";
    }

    return summaries.join("\n\n");
  }
}
