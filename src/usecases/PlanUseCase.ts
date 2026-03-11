/**
 * Plan Use Case を定義する。
 * このファイルは、analyzer / critic / advisor を使う plan orchestrated flow を実行手順としてまとめ、前段出力を次段へ渡す専用ワークフローを固定するために存在する。
 */

import { match } from "ts-pattern";
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
  type PlanBatchOutput,
} from "../shared/cli-contract.js";

type AdapterCallResult = ProviderCallResult & {
  usage?: UsageProps | null;
  citations?: CitationProps[];
};

type PlanTaskSpec = {
  role: "analyzer" | "critic" | "advisor";
  label: string;
  instruction: string;
};

type PlanInput = {
  question: string;
  fileContent?: string;
  filePath?: string;
  providers: readonly ProviderSpec[];
  timeoutMs: number;
  cwd: string;
};

type PlanTaskExecution = {
  spec: PlanTaskSpec;
  task: RunTask;
  prompt: string;
};

type ProviderPlanExecution = {
  provider: ProviderSpec;
  session: Session;
  taskExecutions: readonly PlanTaskExecution[];
};

type ProviderPlanStep =
  | {
      kind: "fulfilled";
      taskExecution: PlanTaskExecution;
      adapterResult: AdapterCallResult;
    }
  | {
      kind: "rejected";
      taskExecution: PlanTaskExecution;
      reason: unknown;
    }
  | {
      kind: "skipped";
      taskExecution: PlanTaskExecution;
    };

const PLAN_TASKS: PlanTaskSpec[] = [
  {
    role: "analyzer",
    label: "analysis",
    instruction:
      "Analyze the plan's assumptions, scope, and feasibility. Make implicit assumptions explicit.",
  },
  {
    role: "critic",
    label: "critique",
    instruction:
      "Point out risks, gaps, ordering mistakes, weak verification, rollback gaps, and observability issues.",
  },
  {
    role: "advisor",
    label: "advice",
    instruction:
      "Summarize improvements and finish with PLAN_VERDICT: good|revise.",
  },
];

/**
 * advisor 出力から最終 verdict を抽出する。
 * `PLAN_VERDICT:` の最終出現を source of truth とし、表示や exit code が同じ判定に従うようにする。
 *
 * @param text provider から返った生テキスト。
 * @returns 抽出できた verdict。見つからなければ `undefined`。
 */
function extractPlanVerdict(text: string): "good" | "revise" | undefined {
  const matches = [...text.matchAll(/PLAN_VERDICT:\s*(good|revise)/gi)];
  const lastMatch = matches.at(-1);
  const verdict = lastMatch?.[1]?.toLowerCase();

  return match(verdict)
    .returnType<"good" | "revise" | undefined>()
    .with("good", () => "good")
    .with("revise", () => "revise")
    .otherwise(() => undefined);
}

/**
 * source document artifact の拡張子を決める。
 * 保存先の artifact 名から元ファイル種別を追いやすくしつつ、未対応の拡張子でも安全に text として扱えるようにする。
 *
 * @param filePath `--file` で渡されたパス。
 * @returns artifact 保存に使う拡張子。
 * @remarks markdown 系は拡張子を保持し、それ以外は text artifact として `.txt` に正規化する。
 */
function getDocumentExtension(filePath?: string): ".md" | ".markdown" | ".txt" {
  if (filePath?.endsWith(".md")) {
    return ".md";
  }

  if (filePath?.endsWith(".markdown")) {
    return ".markdown";
  }

  return ".txt";
}

/**
 * source document artifact の MIME type を決める。
 * markdown と plain text を区別して保存し、後続で artifact を読む側が内容種別を推測しやすいようにする。
 *
 * @param filePath `--file` で渡されたパス。
 * @returns artifact metadata に保存する MIME type。
 */
function getDocumentMimeType(
  filePath?: string,
): "text/markdown" | "text/plain" {
  if (filePath?.endsWith(".md") || filePath?.endsWith(".markdown")) {
    return "text/markdown";
  }

  return "text/plain";
}

/**
 * `plan` の user turn に保存する内容を整形する。
 * followup が session transcript だけを正本として再構築しても、添付した計画書本文を失わないようにする。
 *
 * @param question ユーザーの質問文。
 * @param fileContent `--file` で渡された計画書本文。
 * @returns session に保存する user turn の内容。
 */
function buildPlanSessionTurnContent(
  question: string,
  fileContent?: string,
): string {
  return [
    question,
    fileContent !== undefined ? `Plan document:\n${fileContent}` : "",
  ]
    .filter((value) => value.length > 0)
    .join("\n\n");
}

/**
 * Plan command の実行手順を定義する。
 * command 実行手順を use case に閉じ込め、CLI / app 層から provider 呼び出し順や state update を切り離す。
 */
export class PlanUseCase {
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
   * @returns BatchPayload<PlanBatchOutput> を解決する Promise。
   * @throws provider が 1 件も指定されていない場合。
   * @remarks source document artifact、session transcript、provider ごとの 3 段 task、comparison report を同じ run に束ねるため、分岐と保存順序をこの method に集約している。
   */
  async execute(input: PlanInput): Promise<BatchPayload<PlanBatchOutput>> {
    if (input.providers.length === 0) {
      throw new Error("At least one provider is required.");
    }

    const providerSessions = await Promise.all(
      input.providers.map(async (provider) => {
        const session = await this.sessionManager.startOrResume({
          title: `Plan: ${input.question.slice(0, 60)}`,
        });
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
      command: "plan",
      mode: "orchestrated",
    });

    const rawContext = await this.contextCollector.collect({
      question: input.question,
      cwd: input.cwd,
      ...(input.filePath !== undefined ? { filePath: input.filePath } : {}),
    });
    const contextArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      ...(singleProviderSession !== undefined
        ? { sessionId: singleProviderSession.session.sessionId }
        : {}),
      kind: "run-context",
      content: rawContext,
    });
    const sourceArtifact =
      input.fileContent !== undefined
        ? await this.artifactRepository.writeTextArtifact({
            runId: run.runId,
            ...(singleProviderSession !== undefined
              ? { sessionId: singleProviderSession.session.sessionId }
              : {}),
            kind: "plan-source-document",
            content: input.fileContent,
            extension: getDocumentExtension(input.filePath),
            mimeType: getDocumentMimeType(input.filePath),
          })
        : undefined;

    this.runCoordinator.createRunContext(run, {
      summary: rawContext.summary,
      question: rawContext.question,
      cwd: rawContext.cwd,
      ...(rawContext.filePath !== undefined
        ? { filePath: rawContext.filePath }
        : {}),
      ...(sourceArtifact !== undefined
        ? {
            sourceArtifactId: sourceArtifact.artifactId,
            sourceArtifactPath: sourceArtifact.path,
          }
        : {}),
      collectedAt: rawContext.collectedAt,
      artifactId: contextArtifact.artifactId,
      artifactPath: contextArtifact.path,
    });

    await Promise.all(
      providerSessions.map(({ session }) =>
        this.sessionManager.appendUserTurn(
          session,
          buildPlanSessionTurnContent(input.question, input.fileContent),
          sourceArtifact !== undefined ? [sourceArtifact.artifactId] : [],
        ),
      ),
    );

    run.transition("planned", this.clock.nowIso());

    const providerExecutions = providerSessions.map(
      (providerSession, index) => {
        const taskExecutions = PLAN_TASKS.map((taskSpec) => {
          const task = this.runCoordinator.createTask(run, {
            taskKind: "provider-review",
            role: taskSpec.role,
            provider: providerSession.provider.name,
            dependsOn: [],
            status: "queued",
            input: {
              label: taskSpec.label,
              reviewerOrder: index + 1,
            },
          });

          return {
            spec: taskSpec,
            task,
            prompt: "",
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

    const results: BatchResult<PlanBatchOutput>[] = [];

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
      command: "plan",
      runId: run.runId,
      status: deriveBatchStatus(results),
      ...(run.reviewStatus ? { reviewStatus: run.reviewStatus } : {}),
      results,
    };
  }

  /**
   * 単一 provider の analyzer/critic/advisor call を順に実行する。
   * provider 内の 3 段フローを順序付きで保ちつつ、provider 間だけ並列化できるようにする。
   *
   * @param providerExecution 対象 provider の実行文脈。
   * @param input plan 入力。
   * @returns 実行結果と step 一覧。
   * @remarks 前段成功時だけ出力を後段 prompt に注入し、途中で失敗した provider では残り task を `skipped` として扱う。
   */
  async #executeProviderSteps(
    providerExecution: ProviderPlanExecution,
    input: PlanInput,
  ): Promise<{
    providerExecution: ProviderPlanExecution;
    steps: readonly ProviderPlanStep[];
  }> {
    const adapter = this.providerRegistry.get(providerExecution.provider.name);
    const steps: ProviderPlanStep[] = [];
    const previousOutputs: string[] = [];
    let hasFailure = false;

    for (const taskExecution of providerExecution.taskExecutions) {
      if (hasFailure) {
        steps.push({
          kind: "skipped",
          taskExecution,
        });
        continue;
      }

      const prompt = this.#buildTaskPrompt(
        taskExecution.spec,
        input,
        previousOutputs,
      );
      taskExecution.prompt = prompt;
      taskExecution.task.input = {
        ...taskExecution.task.input,
        prompt,
      };
      taskExecution.task.transition("running", this.clock.nowIso());

      try {
        const adapterResult: AdapterCallResult = await adapter.call({
          provider: providerExecution.provider.name,
          prompt,
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
        if (!(adapterResult.isError ?? false)) {
          previousOutputs.push(
            `[${taskExecution.spec.label}]\n${adapterResult.rawText}`,
          );
        }
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
   * provider 単位の plan steps を ledger と batch result へ反映する。
   * task ごとの成功・失敗・skip をまとめて記録し、final batch result を組み立てる。
   *
   * @param run 更新対象の run。
   * @param question plan 対象の質問。
   * @param providerStep provider 単位の step 実行結果。
   * @returns provider 単位の batch result。
   * @remarks advisor の raw output を summary の source of truth にしつつ、error と `PLAN_VERDICT: revise` の両方を review-needed 判定へ畳み込む。
   */
  async #recordProviderSteps(
    run: Run,
    question: string,
    providerStep: {
      providerExecution: ProviderPlanExecution;
      steps: readonly ProviderPlanStep[];
    },
  ): Promise<BatchResult<PlanBatchOutput>> {
    const normalizedResponses: NormalizedResponseLike[] = [];
    const details: string[] = [];
    let providerSummary: string | undefined;
    let hasError = false;
    let errorMessage: string | undefined;
    let verdict: "good" | "revise" | undefined;

    for (const step of providerStep.steps) {
      await match(step)
        .returnType<Promise<void>>()
        .with(
          { kind: "fulfilled" },
          async ({ taskExecution, adapterResult }) => {
            const recorded = await this.#recordPlanTaskSuccess(
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
            if (taskExecution.spec.role === "advisor") {
              providerSummary = adapterResult.rawText.trim();
            }
            verdict = extractPlanVerdict(adapterResult.rawText) ?? verdict;
          },
        )
        .with({ kind: "rejected" }, async ({ taskExecution, reason }) => {
          hasError = true;
          const recorded = await this.#recordPlanTaskFailure(
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

    const summary = this.#buildProviderSummary(providerSummary);
    await this.sessionManager.appendAssistantTurn(
      providerStep.providerExecution.session,
      details.join("\n\n"),
    );

    const reviewStatus =
      hasError || verdict === "revise" ? "needs-review" : "ready";

    return {
      provider: providerStep.providerExecution.provider.name,
      sessionId: providerStep.providerExecution.session.sessionId,
      status: hasError ? "partial" : "completed",
      reviewStatus,
      ...(errorMessage ? { errorMessage } : {}),
      output: {
        kind: "plan",
        summary,
        details,
        ...(verdict !== undefined ? { verdict } : {}),
      },
    };
  }

  /**
   * 成功した plan task を ledger へ反映する。
   * raw artifact、normalized response、task result をまとめて作り、task 単位の成功記録を一貫させる。
   *
   * @param run 更新対象の run。
   * @param session provider session。
   * @param providerName 対象 provider。
   * @param taskExecution 対象 task。
   * @param adapterResult provider から返った生結果。
   * @returns 表示 detail と normalized response。
   */
  async #recordPlanTaskSuccess(
    run: Run,
    session: Session,
    providerName: ProviderName,
    taskExecution: PlanTaskExecution,
    adapterResult: AdapterCallResult,
  ): Promise<{
    detail: string;
    normalized: NormalizedResponseLike;
  }> {
    const jsonArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "plan-task-output-json",
      content: adapterResult.rawJson ?? { rawText: adapterResult.rawText },
    });
    const textArtifact = await this.artifactRepository.writeTextArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "plan-task-output-text",
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
   * 失敗した plan task を ledger へ反映する。
   * 例外を artifact と normalized error に変換し、後続 step が止まった理由を追跡できるようにする。
   *
   * @param run 更新対象の run。
   * @param session provider session。
   * @param providerName 対象 provider。
   * @param taskExecution 対象 task。
   * @param reason 例外または失敗理由。
   * @returns 表示 detail と失敗 message。
   */
  async #recordPlanTaskFailure(
    run: Run,
    session: Session,
    providerName: ProviderName,
    taskExecution: PlanTaskExecution,
    reason: unknown,
  ): Promise<{
    detail: string;
    message: string;
  }> {
    const message = reason instanceof Error ? reason.message : String(reason);
    const jsonArtifact = await this.artifactRepository.writeJsonArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "plan-task-output-json",
      content: { error: message },
    });
    const textArtifact = await this.artifactRepository.writeTextArtifact({
      runId: run.runId,
      sessionId: session.sessionId,
      kind: "plan-task-output-text",
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
   * 各段階の出力を踏まえて task prompt を構築する。
   * 前段の成功出力を just-in-time で後段 prompt へ注入し、plan review の段階性を維持する。
   *
   * @param taskSpec 現在の task 定義。
   * @param input plan 入力。
   * @param previousOutputs 直前までの成功出力。
   * @returns provider call に渡す prompt。
   * @remarks 同じ source document を各段階へ渡しつつ、critic と advisor にだけ前段要約を注入できるよう空 section を除去して組み立てる。
   */
  #buildTaskPrompt(
    taskSpec: PlanTaskSpec,
    input: PlanInput,
    previousOutputs: readonly string[],
  ): string {
    return [
      "You are an AI coding assistant running under aipanel plan orchestrated mode.",
      `Task focus: ${taskSpec.instruction}`,
      input.fileContent !== undefined
        ? `Plan document:\n${input.fileContent}`
        : "",
      previousOutputs.length > 0
        ? `Previous analysis:\n${previousOutputs.join("\n\n")}`
        : "",
      `User request:\n${input.question}`,
      "Reply concisely with analysis, evidence, and actionable improvements when relevant.",
    ]
      .filter((value) => value.length > 0)
      .join("\n\n");
  }

  /**
   * batch result status を run status へ変換する。
   * plan batch の集約結果を run ledger の status 名へ写し替え、保存時の分岐を増やさないようにする。
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
   * provider ごとの最終 summary を作る。
   * advisor 出力を source of truth にし、caller が最後の改善提案を主 summary として参照できるようにする。
   *
   * @param providerSummary provider の advisor 生出力。
   * @returns provider summary。
   */
  #buildProviderSummary(providerSummary?: string): string {
    return providerSummary && providerSummary.length > 0
      ? providerSummary
      : "No recommendation available.";
  }

  /**
   * plan batch 全体の summary を作る。
   * provider ごとの advisor detail を連結し、run final summary から最終提案だけを追えるようにする。
   *
   * @param results 集約対象の batch result 一覧。
   * @returns run summary。
   */
  #buildBatchSummary(results: readonly BatchResult<PlanBatchOutput>[]): string {
    const summaries = results
      .map((result) => `${result.provider}: ${result.output.summary}`.trim())
      .filter((value) => value.length > 0);

    if (summaries.length === 0) {
      return "No recommendation available.";
    }

    return summaries.join("\n\n");
  }
}
