import {
  SCHEMA_VERSION,
  compactObject,
  defaultClock,
  defaultIdGenerator,
  optionalProp,
  type Clock,
  type IdGenerator,
  type IsoDateString,
} from "./base.js";

export interface ArtifactProps {
  schemaVersion?: number;
  artifactId: string;
  kind: string;
  path: string;
  sessionId?: string | null;
  runId?: string | null;
  turnId?: string | null;
  createdAt: IsoDateString;
  metadataPath?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export class Artifact {
  public readonly schemaVersion: number;
  public readonly artifactId: string;
  public readonly kind: string;
  public readonly path: string;
  public readonly sessionId: string | null;
  public readonly runId: string | null;
  public readonly turnId: string | null;
  public readonly createdAt: IsoDateString;
  public readonly metadataPath: string | null;
  public readonly mimeType: string | null;
  public readonly sizeBytes: number | null;

  constructor(props: ArtifactProps) {
    this.schemaVersion = props.schemaVersion ?? SCHEMA_VERSION;
    this.artifactId = props.artifactId;
    this.kind = props.kind;
    this.path = props.path;
    this.sessionId = props.sessionId ?? null;
    this.runId = props.runId ?? null;
    this.turnId = props.turnId ?? null;
    this.createdAt = props.createdAt;
    this.metadataPath = props.metadataPath ?? null;
    this.mimeType = props.mimeType ?? null;
    this.sizeBytes = props.sizeBytes ?? null;
  }

  static create(
    params: Omit<ArtifactProps, "artifactId" | "createdAt"> & {
      artifactId?: string;
      createdAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): Artifact {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;

    return new Artifact({
      artifactId: params.artifactId ?? idGenerator("artifact"),
      kind: params.kind,
      path: params.path,
      createdAt: params.createdAt ?? clock(),
      ...optionalProp("sessionId", params.sessionId),
      ...optionalProp("runId", params.runId),
      ...optionalProp("turnId", params.turnId),
      ...optionalProp("metadataPath", params.metadataPath),
      ...optionalProp("mimeType", params.mimeType),
      ...optionalProp("sizeBytes", params.sizeBytes),
    });
  }

  static fromJSON(input: ArtifactProps): Artifact {
    return new Artifact(input);
  }

  toJSON(): ArtifactProps {
    return compactObject({
      schemaVersion: this.schemaVersion,
      artifactId: this.artifactId,
      kind: this.kind,
      path: this.path,
      sessionId: this.sessionId,
      runId: this.runId,
      turnId: this.turnId,
      createdAt: this.createdAt,
      metadataPath: this.metadataPath,
      mimeType: this.mimeType,
      sizeBytes: this.sizeBytes,
    });
  }
}
