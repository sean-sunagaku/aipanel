import { compactObject, type IsoDateString } from "./base.js";

export interface ProviderRefProps {
  provider: string;
  providerSessionId: string;
  workingDirectory?: string | null;
  lastUsedAt?: IsoDateString | null;
}

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

  static from(input: ProviderRef | ProviderRefProps): ProviderRef {
    return input instanceof ProviderRef ? input : new ProviderRef(input);
  }

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

  static from(input: Usage | UsageProps | null | undefined): Usage | null {
    if (!input) {
      return null;
    }

    return input instanceof Usage ? input : new Usage(input);
  }

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

  static from(input: Citation | CitationProps): Citation {
    return input instanceof Citation ? input : new Citation(input);
  }

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

export class TaskDependency {
  public readonly taskId: string;
  public readonly dependencyTaskId: string;

  constructor(props: TaskDependencyProps) {
    this.taskId = props.taskId;
    this.dependencyTaskId = props.dependencyTaskId;
  }

  static from(input: TaskDependency | TaskDependencyProps): TaskDependency {
    return input instanceof TaskDependency ? input : new TaskDependency(input);
  }

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

export class FileRef {
  public readonly path: string;
  public readonly purpose: string | null;
  public readonly checksum: string | null;

  constructor(props: FileRefProps) {
    this.path = props.path;
    this.purpose = props.purpose ?? null;
    this.checksum = props.checksum ?? null;
  }

  static from(input: FileRef | FileRefProps): FileRef {
    return input instanceof FileRef ? input : new FileRef(input);
  }

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

export class DiffRef {
  public readonly path: string;
  public readonly range: string | null;
  public readonly summary: string | null;

  constructor(props: DiffRefProps) {
    this.path = props.path;
    this.range = props.range ?? null;
    this.summary = props.summary ?? null;
  }

  static from(input: DiffRef | DiffRefProps): DiffRef {
    return input instanceof DiffRef ? input : new DiffRef(input);
  }

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

export class LogRef {
  public readonly path: string;
  public readonly source: string | null;
  public readonly capturedAt: IsoDateString | null;

  constructor(props: LogRefProps) {
    this.path = props.path;
    this.source = props.source ?? null;
    this.capturedAt = props.capturedAt ?? null;
  }

  static from(input: LogRef | LogRefProps): LogRef {
    return input instanceof LogRef ? input : new LogRef(input);
  }

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

export class ConfidenceScore {
  public readonly level: string;
  public readonly reason: string | null;

  constructor(props: ConfidenceScoreProps) {
    this.level = props.level;
    this.reason = props.reason ?? null;
  }

  static from(input: ConfidenceScore | ConfidenceScoreProps | null | undefined): ConfidenceScore | null {
    if (!input) {
      return null;
    }

    return input instanceof ConfidenceScore ? input : new ConfidenceScore(input);
  }

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

export class ExternalRef {
  public readonly system: string;
  public readonly id: string;
  public readonly scope: string | null;

  constructor(props: ExternalRefProps) {
    this.system = props.system;
    this.id = props.id;
    this.scope = props.scope ?? null;
  }

  static from(input: ExternalRef | ExternalRefProps): ExternalRef {
    return input instanceof ExternalRef ? input : new ExternalRef(input);
  }

  toJSON(): ExternalRefProps {
    return compactObject({
      system: this.system,
      id: this.id,
      scope: this.scope,
    });
  }
}
