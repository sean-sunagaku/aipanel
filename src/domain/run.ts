/**
 * Run ledger を構成する model 群を定義する。
 * このファイルは、consult / followup / debug の 1 実行を ledger として追跡するために、Run と task / response / comparison 系 model をまとめて定義するために存在する。
 */

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
import { type ProviderName } from "../shared/commands.js";
import {
  Citation,
  ConfidenceScore,
  TaskDependency,
  Usage,
  type CitationProps,
  type ConfidenceScoreProps,
  type TaskDependencyProps,
  type UsageProps,
} from "./value-objects.js";
import { literalTuple } from "../shared/literalTuple.js";

export const runStatuses = literalTuple(
  "created",
  "planned",
  "running",
  "completed",
  "partial",
);
export type RunStatus = (typeof runStatuses)[number];

export const taskStatuses = literalTuple(
  "created",
  "queued",
  "running",
  "completed",
  "failed",
  "skipped",
  "partial",
);
export type TaskStatus = (typeof taskStatuses)[number];

export const runCommands = literalTuple("consult", "followup", "debug");
export type RunCommand = (typeof runCommands)[number];

export const runModes = literalTuple("direct", "orchestrated");
export type RunMode = (typeof runModes)[number];

export const runTaskRoles = literalTuple(
  "consult",
  "followup",
  "planner",
  "reviewer",
  "validator",
);
export type RunTaskRole = (typeof runTaskRoles)[number];

export const runTaskKinds = literalTuple("provider-review");
export type RunTaskKind = (typeof runTaskKinds)[number];

export const runReviewStatuses = literalTuple("ready", "needs-review");
export type RunReviewStatus = (typeof runReviewStatuses)[number];

export const runResultStatuses = literalTuple("completed", "partial");
export type RunResultStatus = (typeof runResultStatuses)[number];

const runStatusSet = new Set<string>(runStatuses);
const taskStatusSet = new Set<string>(taskStatuses);
const runModeSet = new Set<string>(runModes);
const runCommandSet = new Set<string>(runCommands);
const runTaskRoleSet = new Set<string>(runTaskRoles);
const runReviewStatusSet = new Set<string>(runReviewStatuses);
const runTaskKindSet = new Set<string>(runTaskKinds);

/**
 * Run Status を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is RunStatus。
 */
export function isRunStatus(value: unknown): value is RunStatus {
  return typeof value === "string" && runStatusSet.has(value);
}

/**
 * Task Status を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is TaskStatus。
 */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && taskStatusSet.has(value);
}

/**
 * Run Command を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is RunCommand。
 */
export function isRunCommand(value: unknown): value is RunCommand {
  return typeof value === "string" && runCommandSet.has(value);
}

/**
 * Run Mode を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is RunMode。
 */
export function isRunMode(value: unknown): value is RunMode {
  return typeof value === "string" && runModeSet.has(value);
}

/**
 * Run Review Status を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is RunReviewStatus。
 */
export function isRunReviewStatus(value: unknown): value is RunReviewStatus {
  return typeof value === "string" && runReviewStatusSet.has(value);
}

/**
 * Run Task Role を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is RunTaskRole。
 */
export function isRunTaskRole(value: unknown): value is RunTaskRole {
  return typeof value === "string" && runTaskRoleSet.has(value);
}

/**
 * Run Task Kind を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is RunTaskKind。
 */
export function isRunTaskKind(value: unknown): value is RunTaskKind {
  return typeof value === "string" && runTaskKindSet.has(value);
}

/**
 * Task Role を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is RunTaskRole。
 */
export function isTaskRole(value: unknown): value is RunTaskRole {
  return isRunTaskRole(value);
}

/**
 * Task Kind を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is RunTaskKind。
 */
export function isTaskKind(value: unknown): value is RunTaskKind {
  return isRunTaskKind(value);
}

/**
 * Run Result Status を満たすか判定する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns value is RunResultStatus。
 */
export function isRunResultStatus(value: unknown): value is RunResultStatus {
  return (
    typeof value === "string" && (value === "completed" || value === "partial")
  );
}

/**
 * Run Task の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */

export interface RunTaskProps {
  taskId: string;
  runId: string;
  taskKind: RunTaskKind;
  role: RunTaskRole;
  provider?: ProviderName | null;
  dependsOn?: TaskDependencyProps[];
  status: TaskStatus;
  input?: Record<string, unknown>;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

/**
 * RunTask を実行内の個別 task model として定義する。
 * debug や direct 実行の途中工程を task 単位で追跡し、provider call ごとの状態遷移と入力を ledger に残す。
 */
export class RunTask {
  public readonly taskId: string;
  public readonly runId: string;
  public readonly taskKind: RunTaskKind;
  public readonly role: RunTaskRole;
  public readonly provider: ProviderName | null;
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

  /**
   * 新しい値 を生成して返す。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param params この処理に渡す入力。
   * @returns RunTask。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
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

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns RunTask。
   */
  static fromJSON(input: RunTaskProps): RunTask {
    return new RunTask(input);
  }

  /**
   * 状態を次の段階へ遷移させる。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param status 処理に渡す status。
   * @param updatedAt 処理に渡す updated At。
   */
  transition(
    status: TaskStatus,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.status = status;
    this.updatedAt = updatedAt;
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns RunTaskProps。
   */
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

/**
 * TaskResult を task の要約結果 model として定義する。
 * task ごとの要約結果と根拠 artifact を分離して保持し、最終 summary 以外の判断材料も run ledger へ残せるようにする。
 */
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

  /**
   * 新しい値 を生成して返す。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param params この処理に渡す入力。
   * @returns TaskResult。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
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

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns TaskResult。
   */
  static fromJSON(input: TaskResultProps): TaskResult {
    return new TaskResult(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns TaskResultProps。
   */
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

export interface RunContextProps {
  runContextId: string;
  runId: string;
  summary: string;
  question: string;
  cwd: string;
  collectedAt: IsoDateString;
  artifactId?: string | null;
  artifactPath?: string | null;
  createdAt: IsoDateString;
}

/**
 * RunContext を実行時 context の記録 model として定義する。
 * 質問・cwd・artifact 化した context を実行単位へ結びつけ、prompt 実行時の前提を session 履歴とは別に記録する。
 */
export class RunContext {
  public readonly runContextId: string;
  public readonly runId: string;
  public readonly summary: string;
  public readonly question: string;
  public readonly cwd: string;
  public readonly collectedAt: IsoDateString;
  public readonly artifactId: string | null;
  public readonly artifactPath: string | null;
  public readonly createdAt: IsoDateString;

  constructor(props: RunContextProps) {
    this.runContextId = props.runContextId;
    this.runId = props.runId;
    this.summary = props.summary;
    this.question = props.question;
    this.cwd = props.cwd;
    this.collectedAt = props.collectedAt;
    this.artifactId = props.artifactId ?? null;
    this.artifactPath = props.artifactPath ?? null;
    this.createdAt = props.createdAt;
  }

  /**
   * 新しい値 を生成して返す。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param params この処理に渡す入力。
   * @returns RunContext。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  static create(
    params: Omit<RunContextProps, "runContextId" | "createdAt"> & {
      runContextId?: string;
      createdAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): RunContext {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;

    return new RunContext({
      runContextId: params.runContextId ?? idGenerator("runctx"),
      runId: params.runId,
      summary: params.summary,
      question: params.question,
      cwd: params.cwd,
      collectedAt: params.collectedAt,
      createdAt: params.createdAt ?? clock(),
      ...(params.artifactId !== undefined
        ? { artifactId: params.artifactId }
        : {}),
      ...(params.artifactPath !== undefined
        ? { artifactPath: params.artifactPath }
        : {}),
    });
  }

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns RunContext。
   */
  static fromJSON(input: RunContextProps): RunContext {
    return new RunContext(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns RunContextProps。
   */
  toJSON(): RunContextProps {
    return compactObject({
      runContextId: this.runContextId,
      runId: this.runId,
      summary: this.summary,
      question: this.question,
      cwd: this.cwd,
      collectedAt: this.collectedAt,
      artifactId: this.artifactId,
      artifactPath: this.artifactPath,
      createdAt: this.createdAt,
    });
  }
}

export interface ProviderResponseProps {
  responseId: string;
  taskId: string;
  provider: ProviderName;
  model: string;
  rawTextRef?: string | null;
  rawJsonRef?: string | null;
  usage?: UsageProps | null;
  latencyMs?: number | null;
  createdAt: IsoDateString;
}

/**
 * ProviderResponse を provider 生応答の記録 model として定義する。
 * provider の raw text/json と usage を保存用 model として固定し、比較や debug で生応答参照先を一貫して扱えるようにする。
 */
export class ProviderResponse {
  public readonly responseId: string;
  public readonly taskId: string;
  public readonly provider: ProviderName;
  public readonly model: string;
  public readonly rawTextRef: string | null;
  public readonly rawJsonRef: string | null;
  public readonly usage: Usage | null;
  public readonly latencyMs: number | null;
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
    this.createdAt = props.createdAt;
  }

  /**
   * 新しい値 を生成して返す。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param params この処理に渡す入力。
   * @returns ProviderResponse。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
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
    });
  }

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns ProviderResponse。
   */
  static fromJSON(input: ProviderResponseProps): ProviderResponse {
    return new ProviderResponse(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns ProviderResponseProps。
   */
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
      createdAt: this.createdAt,
    });
  }
}

export interface NormalizedResponseProps {
  normalizedResponseId: string;
  taskId: string;
  provider: ProviderName;
  summary: string;
  findings?: string[];
  suggestions?: string[];
  citations?: CitationProps[];
  confidence?: ConfidenceScoreProps | null;
  createdAt: IsoDateString;
}

/**
 * NormalizedResponse を比較向け正規化応答の model として定義する。
 * provider 差分を吸収した summary / findings / suggestions を保持し、comparison と render が共通の内部表現を扱えるようにする。
 */
export class NormalizedResponse {
  public readonly normalizedResponseId: string;
  public readonly taskId: string;
  public readonly provider: ProviderName;
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

  /**
   * 新しい値 を生成して返す。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param params この処理に渡す入力。
   * @returns NormalizedResponse。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
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

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns NormalizedResponse。
   */
  static fromJSON(input: NormalizedResponseProps): NormalizedResponse {
    return new NormalizedResponse(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns NormalizedResponseProps。
   */
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

/**
 * ComparisonReport を応答比較結果の model として定義する。
 * 複数 normalized response の一致点・差分・推奨を独立 model として残し、debug の最終判断を run ledger に保存できるようにする。
 */
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

  /**
   * 新しい値 を生成して返す。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param params この処理に渡す入力。
   * @returns ComparisonReport。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
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

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns ComparisonReport。
   */
  static fromJSON(input: ComparisonReportProps): ComparisonReport {
    return new ComparisonReport(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns ComparisonReportProps。
   */
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
  command: RunCommand;
  mode: RunMode;
  status: RunStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  finalSummary?: string | null;
  reviewStatus?: RunReviewStatus | null;
  tasks?: RunTaskProps[];
  taskResults?: TaskResultProps[];
  runContexts?: RunContextProps[];
  providerResponses?: ProviderResponseProps[];
  normalizedResponses?: NormalizedResponseProps[];
  comparisonReports?: ComparisonReportProps[];
}

/**
 * Run を 1 実行の ledger model として定義する。
 * consult / followup / debug の 1 実行に紐づく状態遷移と子要素を一箇所で保持し、session と execution tracking を分離する。
 */
export class Run {
  public readonly schemaVersion: number;
  public readonly runId: string;
  public readonly sessionId: string | null;
  public readonly command: RunCommand;
  public readonly mode: RunMode;
  public status: RunStatus;
  public readonly createdAt: IsoDateString;
  public updatedAt: IsoDateString;
  public finalSummary: string | null;
  public reviewStatus: RunReviewStatus | null;
  public tasks: RunTask[];
  public taskResults: TaskResult[];
  public runContexts: RunContext[];
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
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.finalSummary = props.finalSummary ?? null;
    this.reviewStatus = props.reviewStatus ?? null;
    this.tasks = ensureArray(props.tasks).map((item) => RunTask.fromJSON(item));
    this.taskResults = ensureArray(props.taskResults).map((item) =>
      TaskResult.fromJSON(item),
    );
    this.runContexts = ensureArray(props.runContexts).map((item) =>
      RunContext.fromJSON(item),
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

  /**
   * 新しい値 を生成して返す。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param params この処理に渡す入力。
   * @returns Run。
   */
  static create(params: {
    runId?: string;
    sessionId?: string | null;
    command: RunCommand;
    mode?: RunMode;
    status?: RunStatus;
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
      createdAt,
      updatedAt,
    });
  }

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns Run。
   */
  static fromJSON(input: RunProps): Run {
    return new Run(input);
  }

  /**
   * 状態を次の段階へ遷移させる。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param status 処理に渡す status。
   * @param updatedAt 処理に渡す updated At。
   */
  transition(
    status: RunStatus,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.status = status;
    this.updatedAt = updatedAt;
  }

  /**
   * add Task を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param task 処理に渡す task。
   * @param updatedAt 処理に渡す updated At。
   * @throws 処理を継続できない状態を検出した場合。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  addTask(task: RunTask, updatedAt: IsoDateString = defaultClock()): void {
    if (task.runId !== this.runId) {
      throw new Error(
        `Run task ${task.taskId} does not belong to run ${this.runId}`,
      );
    }

    this.tasks.push(task);
    this.updatedAt = updatedAt;
  }

  /**
   * add Task Result を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param taskResult 処理に渡す task Result。
   * @param updatedAt 処理に渡す updated At。
   */
  addTaskResult(
    taskResult: TaskResult,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.taskResults.push(taskResult);
    this.updatedAt = updatedAt;
  }

  /**
   * add Run Context を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param runContext 処理に渡す run Context。
   * @param updatedAt 処理に渡す updated At。
   * @throws 処理を継続できない状態を検出した場合。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  addRunContext(
    runContext: RunContext,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    if (runContext.runId !== this.runId) {
      throw new Error(
        `Run context ${runContext.runContextId} does not belong to run ${this.runId}`,
      );
    }

    this.runContexts.push(runContext);
    this.updatedAt = updatedAt;
  }

  /**
   * add Provider Response を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param providerResponse 処理に渡す provider Response。
   * @param updatedAt 処理に渡す updated At。
   */
  addProviderResponse(
    providerResponse: ProviderResponse,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.providerResponses.push(providerResponse);
    this.updatedAt = updatedAt;
  }

  /**
   * add Normalized Response を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param normalizedResponse 処理に渡す normalized Response。
   * @param updatedAt 処理に渡す updated At。
   */
  addNormalizedResponse(
    normalizedResponse: NormalizedResponse,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    this.normalizedResponses.push(normalizedResponse);
    this.updatedAt = updatedAt;
  }

  /**
   * add Comparison Report を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param comparisonReport 処理に渡す comparison Report。
   * @param updatedAt 処理に渡す updated At。
   * @throws 処理を継続できない状態を検出した場合。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
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

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns RunProps。
   */
  toJSON(): RunProps {
    return compactObject({
      schemaVersion: this.schemaVersion,
      runId: this.runId,
      sessionId: this.sessionId,
      command: this.command,
      mode: this.mode,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      finalSummary: this.finalSummary,
      reviewStatus: this.reviewStatus,
      tasks: this.tasks.map((item) => item.toJSON()),
      taskResults: this.taskResults.map((item) => item.toJSON()),
      runContexts: this.runContexts.map((item) => item.toJSON()),
      providerResponses: this.providerResponses.map((item) => item.toJSON()),
      normalizedResponses: this.normalizedResponses.map((item) =>
        item.toJSON(),
      ),
      comparisonReports: this.comparisonReports.map((item) => item.toJSON()),
    });
  }
}
