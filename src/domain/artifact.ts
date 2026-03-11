/**
 * Artifact と artifact kind を定義する。
 * このファイルは、run や session に紐づく保存物を domain model として扱い、artifact metadata の正本を repository ごとに散らさないために存在する。
 */

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
import { literalTuple } from "../shared/literalTuple.js";

interface ArtifactProps {
  schemaVersion?: number;
  artifactId: string;
  kind: ArtifactKind;
  path: string;
  sessionId?: string | null;
  runId?: string | null;
  turnId?: string | null;
  createdAt: IsoDateString;
  metadataPath?: string | null;
  mimeType?: ArtifactMimeType | null;
  sizeBytes?: number | null;
}

export const artifactKinds = literalTuple(
  "run-context",
  "provider-response-json",
  "provider-response-text",
  "debug-task-output-json",
  "debug-task-output-text",
  "plan-task-output-json",
  "plan-task-output-text",
  "plan-source-document",
);

export type ArtifactKind = (typeof artifactKinds)[number];
export type ArtifactMimeType = `${string}/${string}`;

/**
 * Artifact を保存物メタデータの model として定義する。
 * run や session に紐づく保存物を名前付きで追跡し、artifact path や MIME 情報の正本を repository ごとに散らさないようにする。
 */
export class Artifact {
  public readonly schemaVersion: number;
  public readonly artifactId: string;
  public readonly kind: ArtifactKind;
  public readonly path: string;
  public readonly sessionId: string | null;
  public readonly runId: string | null;
  public readonly turnId: string | null;
  public readonly createdAt: IsoDateString;
  public readonly metadataPath: string | null;
  public readonly mimeType: ArtifactMimeType | null;
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

  /**
   * 新しい値 を生成して返す。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param params この処理に渡す入力。
   * @returns Artifact。
   */
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

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns Artifact。
   */
  static fromJSON(input: ArtifactProps): Artifact {
    return new Artifact(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns ArtifactProps。
   */
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
