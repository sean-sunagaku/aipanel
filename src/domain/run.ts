import {
  SCHEMA_VERSION,
  compactObject,
  defaultClock,
  defaultIdGenerator,
  ensureArray,
  type Clock,
  type IdGenerator,
  type IsoDateString,
} from "./base.js";
import {
  Citation,
  ConfidenceScore,
  DiffRef,
  ExternalRef,
  FileRef,
  LogRef,
  TaskDependency,
  Usage,
  type CitationProps,
  type ConfidenceScoreProps,
  type DiffRefProps,
  type ExternalRefProps,
  type FileRefProps,
  type LogRefProps,
  type TaskDependencyProps,
  type UsageProps,
} from "./value-objects.js";

export type RunStatus =
  | "created"
  | "planned"
  | "running"
  | "merged"
  | "validated"
  | "completed"
  | "failed"
  | "partial";

export type TaskStatus =
  | "created"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "partial";

export interface RunTaskProps {
  taskId: string;
  runId: string;
  taskKind: string;
  role: string;
  provider?: string | null;
  dependsOn?: TaskDependencyProps[];
  status: TaskStatus;
  input?: Record<string, unknown>;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export class RunTask {
  public readonly taskId: string;
  public readonly runId: string;
  public readonly taskKind: string;
  public readonly role: string;
  public readonly provider: string | null;
  public readonly dependsOn: TaskDependency[];
  public status: TaskStatus;
  public input: Record<string, unknown>;
  public readonly createdAt: IsoDateString;
  public updatedAt: IsoDateString;

  constructor(props: RunTaskProps) {
    this.taskId = props.taskId;
    this.runId = props.runId;
    this.taskKind = props.taskKind;
    this.role = props.role;
    this.provider = props.provider ?? null;
    this.dependsOn = ensureArray(props.dependsOn).map((item) =>
      TaskDependency.from(item),
    );
    this.status = props.status;
    this.input = props.input ?? {};
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    params: Omit<RunTaskProps, "taskId" | "createdAt" | "updatedAt"> & {
      taskId?: string;
      createdAt?: IsoDateString;
      updatedAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): RunTask {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;
    const createdAt = params.createdAt ?? clock();
    const updatedAt = params.updatedAt ?? createdAt;

    return new RunTask({
      taskId: params.taskId ?? idGenerator("task"),
      runId: params.runId,
      taskKind: params.taskKind,
      role: params.role,
      status: params.status,
      createdAt,
      updatedAt,
      ...(params.provider !== undefined ? { provider: params.provider } : {}),
      ...(params.dependsOn !== undefined
        ? { dependsOn: params.dependsOn }
        : {}),
      ...(params.input !== undefined ? { input: params.input } : {}),
    });
  }

  static fromJSON(input: RunTaskProps): RunTask {
    return new RunTask(input);
  }

  transition(
    status: TaskStatus,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.status = status;
    this.updatedAt = updatedAt;
  }

  toJSON(): RunTaskProps {
    return compactObject({
      taskId: this.taskId,
      runId: this.runId,
      taskKind: this.taskKind,
      role: this.role,
      provider: this.provider,
      dependsOn: this.dependsOn.map((item) => item.toJSON()),
      status: this.status,
      input: this.input,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }
}

export interface TaskResultProps {
  resultId: string;
  taskId: string;
  summary: string;
  findings?: string[];
  citations?: CitationProps[];
  confidence?: ConfidenceScoreProps | null;
  sourceArtifactIds?: string[];
  createdAt: IsoDateString;
}

export class TaskResult {
  public readonly resultId: string;
  public readonly taskId: string;
  public readonly summary: string;
  public readonly findings: string[];
  public readonly citations: Citation[];
  public readonly confidence: ConfidenceScore | null;
  public readonly sourceArtifactIds: string[];
  public readonly createdAt: IsoDateString;

  constructor(props: TaskResultProps) {
    this.resultId = props.resultId;
    this.taskId = props.taskId;
    this.summary = props.summary;
    this.findings = ensureArray(props.findings);
    this.citations = ensureArray(props.citations).map((item) =>
      Citation.from(item),
    );
    this.confidence = ConfidenceScore.from(props.confidence);
    this.sourceArtifactIds = ensureArray(props.sourceArtifactIds);
    this.createdAt = props.createdAt;
  }

  static create(
    params: Omit<TaskResultProps, "resultId" | "createdAt"> & {
      resultId?: string;
      createdAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): TaskResult {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;

    return new TaskResult({
      resultId: params.resultId ?? idGenerator("result"),
      taskId: params.taskId,
      summary: params.summary,
      createdAt: params.createdAt ?? clock(),
      ...(params.findings !== undefined ? { findings: params.findings } : {}),
      ...(params.citations !== undefined
        ? { citations: params.citations }
        : {}),
      ...(params.confidence !== undefined
        ? { confidence: params.confidence }
        : {}),
      ...(params.sourceArtifactIds !== undefined
        ? { sourceArtifactIds: params.sourceArtifactIds }
        : {}),
    });
  }

  static fromJSON(input: TaskResultProps): TaskResult {
    return new TaskResult(input);
  }

  toJSON(): TaskResultProps {
    return compactObject({
      resultId: this.resultId,
      taskId: this.taskId,
      summary: this.summary,
      findings: this.findings,
      citations: this.citations.map((item) => item.toJSON()),
      confidence: this.confidence?.toJSON() ?? null,
      sourceArtifactIds: this.sourceArtifactIds,
      createdAt: this.createdAt,
    });
  }
}

export interface ContextBundleProps {
  contextId: string;
  runId: string;
  summary: string;
  files?: FileRefProps[];
  diffs?: DiffRefProps[];
  logs?: LogRefProps[];
  metadata?: Record<string, unknown>;
  createdAt: IsoDateString;
}

export class ContextBundle {
  public readonly contextId: string;
  public readonly runId: string;
  public readonly summary: string;
  public readonly files: FileRef[];
  public readonly diffs: DiffRef[];
  public readonly logs: LogRef[];
  public readonly metadata: Record<string, unknown>;
  public readonly createdAt: IsoDateString;

  constructor(props: ContextBundleProps) {
    this.contextId = props.contextId;
    this.runId = props.runId;
    this.summary = props.summary;
    this.files = ensureArray(props.files).map((item) => FileRef.from(item));
    this.diffs = ensureArray(props.diffs).map((item) => DiffRef.from(item));
    this.logs = ensureArray(props.logs).map((item) => LogRef.from(item));
    this.metadata = props.metadata ?? {};
    this.createdAt = props.createdAt;
  }

  static create(
    params: Omit<ContextBundleProps, "contextId" | "createdAt"> & {
      contextId?: string;
      createdAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): ContextBundle {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;

    return new ContextBundle({
      contextId: params.contextId ?? idGenerator("context"),
      runId: params.runId,
      summary: params.summary,
      createdAt: params.createdAt ?? clock(),
      ...(params.files !== undefined ? { files: params.files } : {}),
      ...(params.diffs !== undefined ? { diffs: params.diffs } : {}),
      ...(params.logs !== undefined ? { logs: params.logs } : {}),
      ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    });
  }

  static fromJSON(input: ContextBundleProps): ContextBundle {
    return new ContextBundle(input);
  }

  toJSON(): ContextBundleProps {
    return compactObject({
      contextId: this.contextId,
      runId: this.runId,
      summary: this.summary,
      files: this.files.map((item) => item.toJSON()),
      diffs: this.diffs.map((item) => item.toJSON()),
      logs: this.logs.map((item) => item.toJSON()),
      metadata: this.metadata,
      createdAt: this.createdAt,
    });
  }
}

export interface ProviderResponseProps {
  responseId: string;
  taskId: string;
  provider: string;
  model: string;
  rawTextRef?: string | null;
  rawJsonRef?: string | null;
  usage?: UsageProps | null;
  latencyMs?: number | null;
  externalRefs?: ExternalRefProps[];
  createdAt: IsoDateString;
}

export class ProviderResponse {
  public readonly responseId: string;
  public readonly taskId: string;
  public readonly provider: string;
  public readonly model: string;
  public readonly rawTextRef: string | null;
  public readonly rawJsonRef: string | null;
  public readonly usage: Usage | null;
  public readonly latencyMs: number | null;
  public readonly externalRefs: ExternalRef[];
  public readonly createdAt: IsoDateString;

  constructor(props: ProviderResponseProps) {
    this.responseId = props.responseId;
    this.taskId = props.taskId;
    this.provider = props.provider;
    this.model = props.model;
    this.rawTextRef = props.rawTextRef ?? null;
    this.rawJsonRef = props.rawJsonRef ?? null;
    this.usage = Usage.from(props.usage);
    this.latencyMs = props.latencyMs ?? null;
    this.externalRefs = ensureArray(props.externalRefs).map((item) =>
      ExternalRef.from(item),
    );
    this.createdAt = props.createdAt;
  }

  static create(
    params: Omit<ProviderResponseProps, "responseId" | "createdAt"> & {
      responseId?: string;
      createdAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): ProviderResponse {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;

    return new ProviderResponse({
      responseId: params.responseId ?? idGenerator("provider_response"),
      taskId: params.taskId,
      provider: params.provider,
      model: params.model,
      createdAt: params.createdAt ?? clock(),
      ...(params.rawTextRef !== undefined
        ? { rawTextRef: params.rawTextRef }
        : {}),
      ...(params.rawJsonRef !== undefined
        ? { rawJsonRef: params.rawJsonRef }
        : {}),
      ...(params.usage !== undefined ? { usage: params.usage } : {}),
      ...(params.latencyMs !== undefined
        ? { latencyMs: params.latencyMs }
        : {}),
      ...(params.externalRefs !== undefined
        ? { externalRefs: params.externalRefs }
        : {}),
    });
  }

  static fromJSON(input: ProviderResponseProps): ProviderResponse {
    return new ProviderResponse(input);
  }

  toJSON(): ProviderResponseProps {
    return compactObject({
      responseId: this.responseId,
      taskId: this.taskId,
      provider: this.provider,
      model: this.model,
      rawTextRef: this.rawTextRef,
      rawJsonRef: this.rawJsonRef,
      usage: this.usage?.toJSON() ?? null,
      latencyMs: this.latencyMs,
      externalRefs: this.externalRefs.map((item) => item.toJSON()),
      createdAt: this.createdAt,
    });
  }
}

export interface NormalizedResponseProps {
  normalizedResponseId: string;
  taskId: string;
  provider: string;
  summary: string;
  findings?: string[];
  suggestions?: string[];
  citations?: CitationProps[];
  confidence?: ConfidenceScoreProps | null;
  createdAt: IsoDateString;
}

export class NormalizedResponse {
  public readonly normalizedResponseId: string;
  public readonly taskId: string;
  public readonly provider: string;
  public readonly summary: string;
  public readonly findings: string[];
  public readonly suggestions: string[];
  public readonly citations: Citation[];
  public readonly confidence: ConfidenceScore | null;
  public readonly createdAt: IsoDateString;

  constructor(props: NormalizedResponseProps) {
    this.normalizedResponseId = props.normalizedResponseId;
    this.taskId = props.taskId;
    this.provider = props.provider;
    this.summary = props.summary;
    this.findings = ensureArray(props.findings);
    this.suggestions = ensureArray(props.suggestions);
    this.citations = ensureArray(props.citations).map((item) =>
      Citation.from(item),
    );
    this.confidence = ConfidenceScore.from(props.confidence);
    this.createdAt = props.createdAt;
  }

  static create(
    params: Omit<
      NormalizedResponseProps,
      "normalizedResponseId" | "createdAt"
    > & {
      normalizedResponseId?: string;
      createdAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): NormalizedResponse {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;

    return new NormalizedResponse({
      normalizedResponseId:
        params.normalizedResponseId ?? idGenerator("normalized_response"),
      taskId: params.taskId,
      provider: params.provider,
      summary: params.summary,
      createdAt: params.createdAt ?? clock(),
      ...(params.findings !== undefined ? { findings: params.findings } : {}),
      ...(params.suggestions !== undefined
        ? { suggestions: params.suggestions }
        : {}),
      ...(params.citations !== undefined
        ? { citations: params.citations }
        : {}),
      ...(params.confidence !== undefined
        ? { confidence: params.confidence }
        : {}),
    });
  }

  static fromJSON(input: NormalizedResponseProps): NormalizedResponse {
    return new NormalizedResponse(input);
  }

  toJSON(): NormalizedResponseProps {
    return compactObject({
      normalizedResponseId: this.normalizedResponseId,
      taskId: this.taskId,
      provider: this.provider,
      summary: this.summary,
      findings: this.findings,
      suggestions: this.suggestions,
      citations: this.citations.map((item) => item.toJSON()),
      confidence: this.confidence?.toJSON() ?? null,
      createdAt: this.createdAt,
    });
  }
}

export interface ComparisonReportProps {
  reportId: string;
  runId: string;
  topic: string;
  responseIds?: string[];
  agreements?: string[];
  differences?: string[];
  recommendation?: string | null;
  createdAt: IsoDateString;
}

export class ComparisonReport {
  public readonly reportId: string;
  public readonly runId: string;
  public readonly topic: string;
  public readonly responseIds: string[];
  public readonly agreements: string[];
  public readonly differences: string[];
  public readonly recommendation: string | null;
  public readonly createdAt: IsoDateString;

  constructor(props: ComparisonReportProps) {
    this.reportId = props.reportId;
    this.runId = props.runId;
    this.topic = props.topic;
    this.responseIds = ensureArray(props.responseIds);
    this.agreements = ensureArray(props.agreements);
    this.differences = ensureArray(props.differences);
    this.recommendation = props.recommendation ?? null;
    this.createdAt = props.createdAt;
  }

  static create(
    params: Omit<ComparisonReportProps, "reportId" | "createdAt"> & {
      reportId?: string;
      createdAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): ComparisonReport {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;

    return new ComparisonReport({
      reportId: params.reportId ?? idGenerator("comparison_report"),
      runId: params.runId,
      topic: params.topic,
      createdAt: params.createdAt ?? clock(),
      ...(params.responseIds !== undefined
        ? { responseIds: params.responseIds }
        : {}),
      ...(params.agreements !== undefined
        ? { agreements: params.agreements }
        : {}),
      ...(params.differences !== undefined
        ? { differences: params.differences }
        : {}),
      ...(params.recommendation !== undefined
        ? { recommendation: params.recommendation }
        : {}),
    });
  }

  static fromJSON(input: ComparisonReportProps): ComparisonReport {
    return new ComparisonReport(input);
  }

  toJSON(): ComparisonReportProps {
    return compactObject({
      reportId: this.reportId,
      runId: this.runId,
      topic: this.topic,
      responseIds: this.responseIds,
      agreements: this.agreements,
      differences: this.differences,
      recommendation: this.recommendation,
      createdAt: this.createdAt,
    });
  }
}

export interface RunProps {
  schemaVersion?: number;
  runId: string;
  sessionId?: string | null;
  command: string;
  mode: string;
  status: RunStatus;
  planVersion: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  plan?: Record<string, unknown> | null;
  finalSummary?: string | null;
  validationStatus?: string | null;
  errorMessage?: string | null;
  tasks?: RunTaskProps[];
  taskResults?: TaskResultProps[];
  contextBundles?: ContextBundleProps[];
  providerResponses?: ProviderResponseProps[];
  normalizedResponses?: NormalizedResponseProps[];
  comparisonReports?: ComparisonReportProps[];
}

export class Run {
  public readonly schemaVersion: number;
  public readonly runId: string;
  public readonly sessionId: string | null;
  public readonly command: string;
  public readonly mode: string;
  public status: RunStatus;
  public readonly planVersion: string;
  public readonly createdAt: IsoDateString;
  public updatedAt: IsoDateString;
  public plan: Record<string, unknown> | null;
  public finalSummary: string | null;
  public validationStatus: string | null;
  public errorMessage: string | null;
  public tasks: RunTask[];
  public taskResults: TaskResult[];
  public contextBundles: ContextBundle[];
  public providerResponses: ProviderResponse[];
  public normalizedResponses: NormalizedResponse[];
  public comparisonReports: ComparisonReport[];

  constructor(props: RunProps) {
    this.schemaVersion = props.schemaVersion ?? SCHEMA_VERSION;
    this.runId = props.runId;
    this.sessionId = props.sessionId ?? null;
    this.command = props.command;
    this.mode = props.mode;
    this.status = props.status;
    this.planVersion = props.planVersion;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.plan = props.plan ?? null;
    this.finalSummary = props.finalSummary ?? null;
    this.validationStatus = props.validationStatus ?? null;
    this.errorMessage = props.errorMessage ?? null;
    this.tasks = ensureArray(props.tasks).map((item) => RunTask.fromJSON(item));
    this.taskResults = ensureArray(props.taskResults).map((item) =>
      TaskResult.fromJSON(item),
    );
    this.contextBundles = ensureArray(props.contextBundles).map((item) =>
      ContextBundle.fromJSON(item),
    );
    this.providerResponses = ensureArray(props.providerResponses).map((item) =>
      ProviderResponse.fromJSON(item),
    );
    this.normalizedResponses = ensureArray(props.normalizedResponses).map(
      (item) => NormalizedResponse.fromJSON(item),
    );
    this.comparisonReports = ensureArray(props.comparisonReports).map((item) =>
      ComparisonReport.fromJSON(item),
    );
  }

  static create(params: {
    runId?: string;
    sessionId?: string | null;
    command: string;
    mode?: string;
    status?: RunStatus;
    planVersion?: string;
    plan?: Record<string, unknown> | null;
    createdAt?: IsoDateString;
    updatedAt?: IsoDateString;
    clock?: Clock;
    idGenerator?: IdGenerator;
  }): Run {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;
    const createdAt = params.createdAt ?? clock();
    const updatedAt = params.updatedAt ?? createdAt;

    return new Run({
      runId: params.runId ?? idGenerator("run"),
      sessionId: params.sessionId ?? null,
      command: params.command,
      mode: params.mode ?? "direct",
      status: params.status ?? "created",
      planVersion: params.planVersion ?? "phase1",
      plan: params.plan ?? null,
      createdAt,
      updatedAt,
    });
  }

  static fromJSON(input: RunProps): Run {
    return new Run(input);
  }

  setPlan(
    plan: Record<string, unknown> | null,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.plan = plan;
    this.updatedAt = updatedAt;
  }

  transition(
    status: RunStatus,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.status = status;
    this.updatedAt = updatedAt;
  }

  addTask(task: RunTask, updatedAt: IsoDateString = defaultClock()): void {
    if (task.runId !== this.runId) {
      throw new Error(
        `Run task ${task.taskId} does not belong to run ${this.runId}`,
      );
    }

    this.tasks.push(task);
    this.updatedAt = updatedAt;
  }

  addTaskResult(
    taskResult: TaskResult,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.taskResults.push(taskResult);
    this.updatedAt = updatedAt;
  }

  addContextBundle(
    contextBundle: ContextBundle,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    if (contextBundle.runId !== this.runId) {
      throw new Error(
        `Context bundle ${contextBundle.contextId} does not belong to run ${this.runId}`,
      );
    }

    this.contextBundles.push(contextBundle);
    this.updatedAt = updatedAt;
  }

  addProviderResponse(
    providerResponse: ProviderResponse,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.providerResponses.push(providerResponse);
    this.updatedAt = updatedAt;
  }

  addNormalizedResponse(
    normalizedResponse: NormalizedResponse,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.normalizedResponses.push(normalizedResponse);
    this.updatedAt = updatedAt;
  }

  addComparisonReport(
    comparisonReport: ComparisonReport,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    if (comparisonReport.runId !== this.runId) {
      throw new Error(
        `Comparison report ${comparisonReport.reportId} does not belong to run ${this.runId}`,
      );
    }

    this.comparisonReports.push(comparisonReport);
    this.updatedAt = updatedAt;
  }

  complete(
    params: {
      finalSummary?: string | null;
      validationStatus?: string | null;
      updatedAt?: IsoDateString;
    } = {},
  ): void {
    this.finalSummary = params.finalSummary ?? this.finalSummary;
    this.validationStatus = params.validationStatus ?? this.validationStatus;
    this.status = "completed";
    this.updatedAt = params.updatedAt ?? defaultClock();
  }

  fail(
    message: string,
    status: RunStatus = "failed",
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.errorMessage = message;
    this.status = status;
    this.updatedAt = updatedAt;
  }

  toJSON(): RunProps {
    return compactObject({
      schemaVersion: this.schemaVersion,
      runId: this.runId,
      sessionId: this.sessionId,
      command: this.command,
      mode: this.mode,
      status: this.status,
      planVersion: this.planVersion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      plan: this.plan,
      finalSummary: this.finalSummary,
      validationStatus: this.validationStatus,
      errorMessage: this.errorMessage,
      tasks: this.tasks.map((item) => item.toJSON()),
      taskResults: this.taskResults.map((item) => item.toJSON()),
      contextBundles: this.contextBundles.map((item) => item.toJSON()),
      providerResponses: this.providerResponses.map((item) => item.toJSON()),
      normalizedResponses: this.normalizedResponses.map((item) =>
        item.toJSON(),
      ),
      comparisonReports: this.comparisonReports.map((item) => item.toJSON()),
    });
  }
}
