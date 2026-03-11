import { compactObject, type IsoDateString } from "./base.js";

export interface ProviderRefProps {
  provider: string;
  providerSessionId: string;
  workingDirectory?: string | null;
  lastUsedAt?: IsoDateString | null;
}

/**
 * Provider Ref の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class ProviderRef {
  public readonly provider: string;
  public readonly providerSessionId: string;
  public readonly workingDirectory: string | null;
  public readonly lastUsedAt: IsoDateString | null;

  constructor(props: ProviderRefProps) {
    this.provider = props.provider;
    this.providerSessionId = props.providerSessionId;
    this.workingDirectory = props.workingDirectory ?? null;
    this.lastUsedAt = props.lastUsedAt ?? null;
  }

  /**
   * from を担当する。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns ProviderRef。
   */
  static from(input: ProviderRef | ProviderRefProps): ProviderRef {
    return input instanceof ProviderRef ? input : new ProviderRef(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns ProviderRefProps。
   */
  toJSON(): ProviderRefProps {
    return compactObject({
      provider: this.provider,
      providerSessionId: this.providerSessionId,
      workingDirectory: this.workingDirectory,
      lastUsedAt: this.lastUsedAt,
    });
  }
}

export interface UsageProps {
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  latencyMs?: number | null;
}

/**
 * Usage の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class Usage {
  public readonly inputTokens: number | null;
  public readonly outputTokens: number | null;
  public readonly costUsd: number | null;
  public readonly latencyMs: number | null;

  constructor(props: UsageProps = {}) {
    this.inputTokens = props.inputTokens ?? null;
    this.outputTokens = props.outputTokens ?? null;
    this.costUsd = props.costUsd ?? null;
    this.latencyMs = props.latencyMs ?? null;
  }

  /**
   * from を担当する。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns Usage | null。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  static from(input: Usage | UsageProps | null | undefined): Usage | null {
    if (!input) {
      return null;
    }

    return input instanceof Usage ? input : new Usage(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns UsageProps。
   */
  toJSON(): UsageProps {
    return compactObject({
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      costUsd: this.costUsd,
      latencyMs: this.latencyMs,
    });
  }
}

export interface CitationProps {
  kind: string;
  label?: string | null;
  pathOrUrl?: string | null;
  line?: number | null;
}

/**
 * Citation の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class Citation {
  public readonly kind: string;
  public readonly label: string | null;
  public readonly pathOrUrl: string | null;
  public readonly line: number | null;

  constructor(props: CitationProps) {
    this.kind = props.kind;
    this.label = props.label ?? null;
    this.pathOrUrl = props.pathOrUrl ?? null;
    this.line = props.line ?? null;
  }

  /**
   * from を担当する。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns Citation。
   */
  static from(input: Citation | CitationProps): Citation {
    return input instanceof Citation ? input : new Citation(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns CitationProps。
   */
  toJSON(): CitationProps {
    return compactObject({
      kind: this.kind,
      label: this.label,
      pathOrUrl: this.pathOrUrl,
      line: this.line,
    });
  }
}

export interface TaskDependencyProps {
  taskId: string;
  dependencyTaskId: string;
}

/**
 * Task Dependency の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class TaskDependency {
  public readonly taskId: string;
  public readonly dependencyTaskId: string;

  constructor(props: TaskDependencyProps) {
    this.taskId = props.taskId;
    this.dependencyTaskId = props.dependencyTaskId;
  }

  /**
   * from を担当する。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns TaskDependency。
   */
  static from(input: TaskDependency | TaskDependencyProps): TaskDependency {
    return input instanceof TaskDependency ? input : new TaskDependency(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns TaskDependencyProps。
   */
  toJSON(): TaskDependencyProps {
    return {
      taskId: this.taskId,
      dependencyTaskId: this.dependencyTaskId,
    };
  }
}

export interface FileRefProps {
  path: string;
  purpose?: string | null;
  checksum?: string | null;
}

/**
 * File Ref の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class FileRef {
  public readonly path: string;
  public readonly purpose: string | null;
  public readonly checksum: string | null;

  constructor(props: FileRefProps) {
    this.path = props.path;
    this.purpose = props.purpose ?? null;
    this.checksum = props.checksum ?? null;
  }

  /**
   * from を担当する。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns FileRef。
   */
  static from(input: FileRef | FileRefProps): FileRef {
    return input instanceof FileRef ? input : new FileRef(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns FileRefProps。
   */
  toJSON(): FileRefProps {
    return compactObject({
      path: this.path,
      purpose: this.purpose,
      checksum: this.checksum,
    });
  }
}

export interface DiffRefProps {
  path: string;
  range?: string | null;
  summary?: string | null;
}

/**
 * Diff Ref の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class DiffRef {
  public readonly path: string;
  public readonly range: string | null;
  public readonly summary: string | null;

  constructor(props: DiffRefProps) {
    this.path = props.path;
    this.range = props.range ?? null;
    this.summary = props.summary ?? null;
  }

  /**
   * from を担当する。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns DiffRef。
   */
  static from(input: DiffRef | DiffRefProps): DiffRef {
    return input instanceof DiffRef ? input : new DiffRef(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns DiffRefProps。
   */
  toJSON(): DiffRefProps {
    return compactObject({
      path: this.path,
      range: this.range,
      summary: this.summary,
    });
  }
}

export interface LogRefProps {
  path: string;
  source?: string | null;
  capturedAt?: IsoDateString | null;
}

/**
 * Log Ref の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class LogRef {
  public readonly path: string;
  public readonly source: string | null;
  public readonly capturedAt: IsoDateString | null;

  constructor(props: LogRefProps) {
    this.path = props.path;
    this.source = props.source ?? null;
    this.capturedAt = props.capturedAt ?? null;
  }

  /**
   * from を担当する。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns LogRef。
   */
  static from(input: LogRef | LogRefProps): LogRef {
    return input instanceof LogRef ? input : new LogRef(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns LogRefProps。
   */
  toJSON(): LogRefProps {
    return compactObject({
      path: this.path,
      source: this.source,
      capturedAt: this.capturedAt,
    });
  }
}

export interface ConfidenceScoreProps {
  level: string;
  reason?: string | null;
}

/**
 * Confidence Score の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class ConfidenceScore {
  public readonly level: string;
  public readonly reason: string | null;

  constructor(props: ConfidenceScoreProps) {
    this.level = props.level;
    this.reason = props.reason ?? null;
  }

  /**
   * from を担当する。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns ConfidenceScore | null。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  static from(
    input: ConfidenceScore | ConfidenceScoreProps | null | undefined,
  ): ConfidenceScore | null {
    if (!input) {
      return null;
    }

    return input instanceof ConfidenceScore
      ? input
      : new ConfidenceScore(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns ConfidenceScoreProps。
   */
  toJSON(): ConfidenceScoreProps {
    return compactObject({
      level: this.level,
      reason: this.reason,
    });
  }
}

export interface ExternalRefProps {
  system: string;
  id: string;
  scope?: string | null;
}

/**
 * External Ref の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class ExternalRef {
  public readonly system: string;
  public readonly id: string;
  public readonly scope: string | null;

  constructor(props: ExternalRefProps) {
    this.system = props.system;
    this.id = props.id;
    this.scope = props.scope ?? null;
  }

  /**
   * from を担当する。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns ExternalRef。
   */
  static from(input: ExternalRef | ExternalRefProps): ExternalRef {
    return input instanceof ExternalRef ? input : new ExternalRef(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns ExternalRefProps。
   */
  toJSON(): ExternalRefProps {
    return compactObject({
      system: this.system,
      id: this.id,
      scope: this.scope,
    });
  }
}
