import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Artifact } from "../domain/artifact.js";
import {
  defaultClock,
  defaultIdGenerator,
  type Clock,
  type IdGenerator,
} from "../domain/base.js";

interface ArtifactRepositoryOptions {
  storageRoot?: string;
  clock?: Clock;
  idGenerator?: IdGenerator;
}

interface ArtifactWriteParams {
  kind: string;
  content: string;
  extension?: string;
  sessionId?: string | null;
  runId?: string | null;
  turnId?: string | null;
  mimeType?: string | null;
}

/**
 * Artifact の保存と復元を担当する。
 * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
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
    const runDirectory = path.join(
      this.storageRoot,
      "artifacts",
      params.runId ?? "_shared",
    );
    const extension = params.extension ?? ".txt";
    const contentPath = path.join(
      runDirectory,
      `${artifactId}${extension.startsWith(".") ? extension : `.${extension}`}`,
    );
    const metadataPath = path.join(runDirectory, `${artifactId}.artifact.json`);

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
      extension?: string;
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
