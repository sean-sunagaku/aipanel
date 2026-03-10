export type Role = "system" | "user" | "assistant";
export type RunMode = "direct" | "orchestrated";
export type RunStatus =
  | "created"
  | "planned"
  | "running"
  | "merged"
  | "validated"
  | "completed"
  | "failed"
  | "partial";

export interface ProviderRef {
  provider: string;
  providerSessionId: string;
  workingDirectory: string;
  lastUsedAt: string;
}

export interface SessionTurnData {
  turnId: string;
  sessionId: string;
  role: Role;
  content: string;
  artifactIds: string[];
  createdAt: string;
}

export interface SessionData {
  sessionId: string;
  title: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  providerRefs: ProviderRef[];
  turns: SessionTurnData[];
}

export interface FileRef {
  path: string;
  absolutePath?: string;
  purpose: string;
  checksum?: string;
  content?: string;
}

export interface DiffRef {
  path: string;
  summary?: string;
  content?: string;
}

export interface LogRef {
  path: string;
  source: string;
  capturedAt: string;
  content?: string;
}

export interface ContextBundleData {
  contextId: string;
  runId: string | null;
  summary: string;
  files: FileRef[];
  diffs: DiffRef[];
  logs: LogRef[];
  metadata: Record<string, unknown>;
}

export interface ProviderCallPlan {
  provider: string;
  prompt: string;
  model?: string;
  sessionHint?: ProviderRef | null;
  timeoutMs?: number;
  mode: RunMode;
}

export interface UsageData {
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  latencyMs?: number | null;
}

export interface ExternalRef {
  system: string;
  id: string;
  scope?: string;
}

export interface ProviderResponseData {
  responseId: string;
  taskId: string;
  provider: string;
  model: string;
  rawText?: string;
  rawJson?: unknown;
  rawTextRef?: string | null;
  rawJsonRef?: string | null;
  usage?: UsageData | null;
  latencyMs?: number;
  externalRefs: ExternalRef[];
  citations?: CitationData[];
  isError?: boolean;
  subtype?: string | null;
}

export interface ConfidenceScoreData {
  level: "low" | "medium" | "high";
  reason?: string | null;
}

export interface CitationData {
  kind: string;
  label?: string | null;
  pathOrUrl?: string | null;
  line?: number | null;
}

export interface NormalizedResponseData {
  normalizedResponseId: string;
  taskId: string;
  provider: string;
  summary: string;
  findings: string[];
  suggestions: string[];
  citations: CitationData[];
  confidence: ConfidenceScoreData;
}

export interface RunTaskData {
  taskId: string;
  runId: string;
  taskKind: string;
  role: string;
  provider?: string | null;
  dependsOn: string[];
  status: RunStatus | "queued";
  prompt?: string;
  summary?: string;
}

export interface TaskResultData {
  resultId: string;
  taskId: string;
  summary: string;
  findings: string[];
  citations: CitationData[];
  confidence: ConfidenceScoreData;
  sourceArtifactIds: string[];
}

export interface ComparisonReportData {
  reportId: string | null;
  runId: string | null;
  topic: string;
  responseIds: string[];
  agreements: string[];
  differences: string[];
  recommendation: string | null;
}

export interface RunData {
  runId: string;
  sessionId: string;
  command: string;
  mode: RunMode;
  status: RunStatus;
  planVersion?: string;
  finalSummary?: string;
  validationStatus?: string;
  tasks: RunTaskData[];
  taskResults: TaskResultData[];
  contextBundles?: ContextBundleData[];
  providerResponses?: ProviderResponseData[];
  normalizedResponses?: NormalizedResponseData[];
  comparisonReport?: ComparisonReportData | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactData {
  artifactId: string;
  kind: string;
  path: string;
  sessionId?: string | null;
  runId?: string | null;
  turnId?: string | null;
  taskId?: string | null;
  createdAt: string;
}

export interface SessionManagerPort {
  startSession(input: { title?: string }): Promise<SessionData>;
  loadSession(sessionId: string): Promise<SessionData | null>;
  appendTurn(input: {
    sessionId: string;
    role: Role;
    content: string;
    artifactIds?: string[];
  }): Promise<SessionData>;
  updateProviderRef(input: {
    sessionId: string;
    providerRef: ProviderRef;
  }): Promise<SessionData>;
}

export interface RunCoordinatorPort {
  startRun(input: {
    sessionId: string;
    command: string;
    mode: RunMode;
  }): Promise<RunData>;
  attachContextBundle(input: {
    runId: string;
    contextBundle: ContextBundleData;
  }): Promise<RunData>;
  appendTask(input: {
    runId: string;
    taskKind: string;
    role: string;
    provider?: string | null;
    dependsOn?: string[];
    prompt?: string;
  }): Promise<RunTaskData>;
  appendTaskResult(input: {
    runId: string;
    taskId: string;
    summary: string;
    findings: string[];
    citations?: CitationData[];
    confidence: ConfidenceScoreData;
    sourceArtifactIds?: string[];
    providerResponse?: ProviderResponseData;
    normalizedResponse?: NormalizedResponseData;
  }): Promise<RunData>;
  finalizeRun(input: {
    runId: string;
    finalSummary: string;
    validationStatus: string;
    comparisonReport?: ComparisonReportData | null;
  }): Promise<RunData>;
  markRunFailed(input: {
    runId: string;
    errorMessage: string;
  }): Promise<RunData>;
  loadRun(runId: string): Promise<RunData | null>;
}

export interface ArtifactRepositoryPort {
  saveArtifact(input: {
    kind: string;
    runId?: string | null;
    sessionId?: string | null;
    turnId?: string | null;
    taskId?: string | null;
    extension?: string;
    content: string;
  }): Promise<ArtifactData>;
}

export interface ProviderAdapterPort {
  readonly name: string;
  call(plan: ProviderCallPlan): Promise<ProviderResponseData>;
}

export interface ProviderRegistryPort {
  list(): string[];
  get(name?: string): ProviderAdapterPort;
}

export interface PlanTaskSpec {
  taskKind: string;
  role: string;
  provider?: string | null;
  prompt: string;
  dependsOn?: string[];
}

export interface ValidationResult {
  status: string;
  notes: string[];
}

export interface RenderResult {
  text: string;
  json: Record<string, unknown>;
}
