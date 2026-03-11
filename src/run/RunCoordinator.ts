/**
 * RunCoordinator を定義する。
 * このファイルは、Run ledger へ child entity を追加する手順をまとめ、use case が task / response / report の生成規約を重複実装しないようにするために存在する。
 */

import {
  ComparisonReport,
  NormalizedResponse,
  ProviderResponse,
  type RunCommand,
  type RunMode,
  Run,
  RunContext,
  RunTask,
  TaskResult,
  type ComparisonReportProps,
  type NormalizedResponseProps,
  type ProviderResponseProps,
  type RunContextProps,
  type RunTaskProps,
  type TaskResultProps,
} from "../domain/run.js";
import {
  defaultClock,
  defaultIdGenerator,
  type Clock,
  type IdGenerator,
} from "../domain/base.js";
import { RunRepository } from "./RunRepository.js";

interface RunCoordinatorOptions {
  repository: RunRepository;
  clock?: Clock;
  idGenerator?: IdGenerator;
}

/**
 * Run の組み立て役を定義する。
 * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
 */
export class RunCoordinator {
  private readonly repository: RunRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(options: RunCoordinatorOptions) {
    this.repository = options.repository;
    this.clock = options.clock ?? defaultClock;
    this.idGenerator = options.idGenerator ?? defaultIdGenerator;
  }

  /**
   * Run を生成して返す。
   * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
   *
   * @param params この処理に渡す入力。
   * @returns Run を解決する Promise。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  async createRun(params: {
    sessionId?: string | null;
    command: RunCommand;
    mode?: RunMode;
  }): Promise<Run> {
    const run = Run.create({
      command: params.command,
      clock: this.clock,
      idGenerator: this.idGenerator,
      ...(params.sessionId !== undefined
        ? { sessionId: params.sessionId }
        : {}),
      ...(params.mode ? { mode: params.mode } : {}),
    });

    return this.repository.save(run);
  }

  /**
   * Task を生成して返す。
   * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
   *
   * @param run 処理に渡す run。
   * @param params この処理に渡す入力。
   * @returns RunTask。
   */
  createTask(
    run: Run,
    params: Omit<RunTaskProps, "taskId" | "runId" | "createdAt" | "updatedAt">,
  ): RunTask {
    const task = RunTask.create({
      ...params,
      runId: run.runId,
      clock: this.clock,
      idGenerator: this.idGenerator,
    });

    run.addTask(task, this.clock());
    return task;
  }

  /**
   * Run Context を生成して返す。
   * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
   *
   * @param run 処理に渡す run。
   * @param params この処理に渡す入力。
   * @returns RunContext。
   */
  createRunContext(
    run: Run,
    params: Omit<RunContextProps, "runContextId" | "runId" | "createdAt">,
  ): RunContext {
    const runContext = RunContext.create({
      ...params,
      runId: run.runId,
      clock: this.clock,
      idGenerator: this.idGenerator,
    });

    run.addRunContext(runContext, this.clock());
    return runContext;
  }

  /**
   * Provider Response を生成して返す。
   * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
   *
   * @param run 処理に渡す run。
   * @param params この処理に渡す入力。
   * @returns ProviderResponse。
   */
  createProviderResponse(
    run: Run,
    params: Omit<ProviderResponseProps, "responseId" | "createdAt">,
  ): ProviderResponse {
    const providerResponse = ProviderResponse.create({
      ...params,
      clock: this.clock,
      idGenerator: this.idGenerator,
    });

    run.addProviderResponse(providerResponse, this.clock());
    return providerResponse;
  }

  /**
   * Normalized Response を生成して返す。
   * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
   *
   * @param run 処理に渡す run。
   * @param params この処理に渡す入力。
   * @returns NormalizedResponse。
   */
  createNormalizedResponse(
    run: Run,
    params: Omit<NormalizedResponseProps, "normalizedResponseId" | "createdAt">,
  ): NormalizedResponse {
    const normalizedResponse = NormalizedResponse.create({
      ...params,
      clock: this.clock,
      idGenerator: this.idGenerator,
    });

    run.addNormalizedResponse(normalizedResponse, this.clock());
    return normalizedResponse;
  }

  /**
   * Task Result を生成して返す。
   * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
   *
   * @param run 処理に渡す run。
   * @param params この処理に渡す入力。
   * @returns TaskResult。
   */
  createTaskResult(
    run: Run,
    params: Omit<TaskResultProps, "resultId" | "createdAt">,
  ): TaskResult {
    const taskResult = TaskResult.create({
      ...params,
      clock: this.clock,
      idGenerator: this.idGenerator,
    });

    run.addTaskResult(taskResult, this.clock());
    return taskResult;
  }

  /**
   * Comparison Report を生成して返す。
   * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
   *
   * @param run 処理に渡す run。
   * @param params この処理に渡す入力。
   * @returns ComparisonReport。
   */
  createComparisonReport(
    run: Run,
    params: Omit<ComparisonReportProps, "reportId" | "runId" | "createdAt">,
  ): ComparisonReport {
    const comparisonReport = ComparisonReport.create({
      ...params,
      runId: run.runId,
      clock: this.clock,
      idGenerator: this.idGenerator,
    });

    run.addComparisonReport(comparisonReport, this.clock());
    return comparisonReport;
  }

  /**
   * 対象 を永続化する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param run 処理に渡す run。
   * @returns Run を解決する Promise。
   */
  async save(run: Run): Promise<Run> {
    return this.repository.save(run);
  }
}
