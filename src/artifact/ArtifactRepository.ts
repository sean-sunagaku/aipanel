/**
 * Artifact Repository を定義する。
 * このファイルは、run 中に生成する text/json artifact の保存規約を repository として固定し、use case がファイル配置を直接扱わずに済むようにするために存在する。
 */

import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  Artifact,
  type ArtifactKind,
  type ArtifactMimeType,
} from "../domain/artifact.js";
import {
  defaultClock,
  defaultIdGenerator,
  type Clock,
  type IdGenerator,
} from "../domain/base.js";
import { buildArtifactPaths } from "./artifact-paths.js";

interface ArtifactRepositoryOptions {
  storageRoot?: string;
  clock?: Clock;
  idGenerator?: IdGenerator;
}

interface ArtifactWriteParams {
  kind: ArtifactKind;
  content: string;
  extension?: `.${string}`;
  sessionId?: string | null;
  runId?: string | null;
  turnId?: string | null;
  mimeType?: ArtifactMimeType | null;
}

/**
 * Artifact の永続化境界を定義する。
 * artifact の保存規約と path 解決を artifact 層へ集め、use case がファイル配置の詳細を直接扱わないようにする。
 */
export class ArtifactRepository {
  private readonly storageRoot: string;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(options: ArtifactRepositoryOptions = {}) {
    this.storageRoot =
      options.storageRoot ?? path.join(process.cwd(), ".aipanel");
    this.clock = options.clock ?? defaultClock;
    this.idGenerator = options.idGenerator ?? defaultIdGenerator;
  }

  /**
   * Text Artifact を書き出す。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param params この処理に渡す入力。
   * @returns Artifact を解決する Promise。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  async writeTextArtifact(params: ArtifactWriteParams): Promise<Artifact> {
    const artifactId = this.idGenerator("artifact");
    const { runDirectory, contentPath, metadataPath } = buildArtifactPaths({
      storageRoot: this.storageRoot,
      artifactId,
      ...(params.runId !== undefined ? { runId: params.runId } : {}),
      ...(params.extension !== undefined
        ? { extension: params.extension }
        : {}),
    });

    await mkdir(runDirectory, { recursive: true });
    await writeFile(contentPath, params.content, "utf8");
    const fileStat = await stat(contentPath);

    const artifact = Artifact.create({
      artifactId,
      kind: params.kind,
      path: contentPath,
      metadataPath,
      sizeBytes: fileStat.size,
      createdAt: this.clock(),
      ...(params.sessionId !== undefined
        ? { sessionId: params.sessionId }
        : {}),
      ...(params.runId !== undefined ? { runId: params.runId } : {}),
      ...(params.turnId !== undefined ? { turnId: params.turnId } : {}),
      ...(params.mimeType !== undefined ? { mimeType: params.mimeType } : {}),
    });

    const resolvedMetadataPath = artifact.metadataPath ?? metadataPath;
    await mkdir(path.dirname(resolvedMetadataPath), { recursive: true });
    await writeFile(
      resolvedMetadataPath,
      JSON.stringify(artifact.toJSON(), null, 2),
      "utf8",
    );
    return Artifact.fromJSON({
      ...artifact.toJSON(),
      metadataPath: resolvedMetadataPath,
    });
  }

  /**
   * Json Artifact を書き出す。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param params この処理に渡す入力。
   * @returns Artifact を解決する Promise。
   */
  async writeJsonArtifact(
    params: Omit<ArtifactWriteParams, "content" | "extension" | "mimeType"> & {
      content: unknown;
      extension?: `.${string}`;
    },
  ): Promise<Artifact> {
    return this.writeTextArtifact({
      ...params,
      content: JSON.stringify(params.content, null, 2),
      extension: params.extension ?? ".json",
      mimeType: "application/json",
    });
  }
}
