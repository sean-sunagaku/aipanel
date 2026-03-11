import {
  ComparisonReport,
  ContextBundle,
  NormalizedResponse,
  ProviderResponse,
  Run,
  RunTask,
  TaskResult,
  type ComparisonReportProps,
  type ContextBundleProps,
  type NormalizedResponseProps,
  type ProviderResponseProps,
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

export class RunCoordinator {
  private readonly repository: RunRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(options: RunCoordinatorOptions) {
    this.repository = options.repository;
    this.clock = options.clock ?? defaultClock;
    this.idGenerator = options.idGenerator ?? defaultIdGenerator;
  }

  async createRun(params: {
    sessionId?: string | null;
    command: string;
    mode?: string;
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

  createContextBundle(
    run: Run,
    params: Omit<ContextBundleProps, "contextId" | "runId" | "createdAt">,
  ): ContextBundle {
    const contextBundle = ContextBundle.create({
      ...params,
      runId: run.runId,
      clock: this.clock,
      idGenerator: this.idGenerator,
    });

    run.addContextBundle(contextBundle, this.clock());
    return contextBundle;
  }

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

  async save(run: Run): Promise<Run> {
    return this.repository.save(run);
  }
}
