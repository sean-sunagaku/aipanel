import {
  ComparisonReport,
  ContextBundle,
  NormalizedResponse,
  ProviderResponse,
  Run,
  RunTask,
  TaskResult,
  defaultClock,
  defaultIdGenerator,
  type Clock,
  type ComparisonReportProps,
  type ContextBundleProps,
  type IdGenerator,
  type NormalizedResponseProps,
  type ProviderResponseProps,
  type RunStatus,
  type RunTaskProps,
  type TaskResultProps,
} from "../domain/index.js";
import { RunRepository } from "./RunRepository.js";

export interface RunCoordinatorOptions {
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
    planVersion?: string;
    plan?: Record<string, unknown> | null;
  }): Promise<Run> {
    const run = Run.create({
      command: params.command,
      clock: this.clock,
      idGenerator: this.idGenerator,
      ...(params.sessionId !== undefined ? { sessionId: params.sessionId } : {}),
      ...(params.mode ? { mode: params.mode } : {}),
      ...(params.planVersion ? { planVersion: params.planVersion } : {}),
      ...(params.plan !== undefined ? { plan: params.plan } : {}),
    });

    return this.repository.save(run);
  }

  createTask(run: Run, params: Omit<RunTaskProps, 'taskId' | 'runId' | 'createdAt' | 'updatedAt'>): RunTask {
    const task = RunTask.create({
      ...params,
      runId: run.runId,
      clock: this.clock,
      idGenerator: this.idGenerator,
    });

    run.addTask(task, this.clock());
    return task;
  }

  createContextBundle(run: Run, params: Omit<ContextBundleProps, 'contextId' | 'runId' | 'createdAt'>): ContextBundle {
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
    params: Omit<ProviderResponseProps, 'responseId' | 'createdAt'>,
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
    params: Omit<NormalizedResponseProps, 'normalizedResponseId' | 'createdAt'>,
  ): NormalizedResponse {
    const normalizedResponse = NormalizedResponse.create({
      ...params,
      clock: this.clock,
      idGenerator: this.idGenerator,
    });

    run.addNormalizedResponse(normalizedResponse, this.clock());
    return normalizedResponse;
  }

  createTaskResult(run: Run, params: Omit<TaskResultProps, 'resultId' | 'createdAt'>): TaskResult {
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
    params: Omit<ComparisonReportProps, 'reportId' | 'runId' | 'createdAt'>,
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

  transition(run: Run, status: RunStatus): Run {
    run.transition(status, this.clock());
    return run;
  }

  complete(run: Run, params: { finalSummary?: string | null; validationStatus?: string | null } = {}): Run {
    run.complete({
      updatedAt: this.clock(),
      ...(params.finalSummary !== undefined ? { finalSummary: params.finalSummary } : {}),
      ...(params.validationStatus !== undefined ? { validationStatus: params.validationStatus } : {}),
    });
    return run;
  }

  fail(run: Run, message: string, status: RunStatus = 'failed'): Run {
    run.fail(message, status, this.clock());
    return run;
  }

  async save(run: Run): Promise<Run> {
    return this.repository.save(run);
  }
}
