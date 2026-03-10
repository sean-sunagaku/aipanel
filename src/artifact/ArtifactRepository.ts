import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  Artifact,
  defaultClock,
  defaultIdGenerator,
  type ArtifactProps,
  type Clock,
  type IdGenerator,
} from "../domain/index.js";

export interface ArtifactRepositoryOptions {
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

export class ArtifactRepository {
  private readonly storageRoot: string;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(options: ArtifactRepositoryOptions = {}) {
    this.storageRoot = options.storageRoot ?? path.join(process.cwd(), '.aipanel');
    this.clock = options.clock ?? defaultClock;
    this.idGenerator = options.idGenerator ?? defaultIdGenerator;
  }

  get artifactsDirectory(): string {
    return path.join(this.storageRoot, 'artifacts');
  }

  runDirectory(runId?: string | null): string {
    return path.join(this.artifactsDirectory, runId ?? '_shared');
  }

  metadataPathFor(artifactId: string, runId?: string | null): string {
    return path.join(this.runDirectory(runId), `${artifactId}.artifact.json`);
  }

  async saveMetadata(artifact: Artifact): Promise<Artifact> {
    const metadataPath = artifact.metadataPath ?? this.metadataPathFor(artifact.artifactId, artifact.runId);
    await mkdir(path.dirname(metadataPath), { recursive: true });
    await writeFile(metadataPath, JSON.stringify(artifact.toJSON(), null, 2), 'utf8');
    return Artifact.fromJSON({
      ...artifact.toJSON(),
      metadataPath,
    });
  }

  async writeTextArtifact(params: ArtifactWriteParams): Promise<Artifact> {
    const artifactId = this.idGenerator('artifact');
    const runDirectory = this.runDirectory(params.runId);
    const extension = params.extension ?? '.txt';
    const contentPath = path.join(runDirectory, `${artifactId}${extension.startsWith('.') ? extension : `.${extension}`}`);
    const metadataPath = this.metadataPathFor(artifactId, params.runId);

    await mkdir(runDirectory, { recursive: true });
    await writeFile(contentPath, params.content, 'utf8');
    const fileStat = await stat(contentPath);

    const artifact = Artifact.create({
      artifactId,
      kind: params.kind,
      path: contentPath,
      metadataPath,
      sizeBytes: fileStat.size,
      createdAt: this.clock(),
      ...(params.sessionId !== undefined ? { sessionId: params.sessionId } : {}),
      ...(params.runId !== undefined ? { runId: params.runId } : {}),
      ...(params.turnId !== undefined ? { turnId: params.turnId } : {}),
      ...(params.mimeType !== undefined ? { mimeType: params.mimeType } : {}),
    });

    await this.saveMetadata(artifact);
    return artifact;
  }

  async writeJsonArtifact(
    params: Omit<ArtifactWriteParams, 'content' | 'extension' | 'mimeType'> & {
      content: unknown;
      extension?: string;
    },
  ): Promise<Artifact> {
    return this.writeTextArtifact({
      ...params,
      content: JSON.stringify(params.content, null, 2),
      extension: params.extension ?? '.json',
      mimeType: 'application/json',
    });
  }

  async get(artifactId: string, runId?: string | null): Promise<Artifact | null> {
    try {
      const raw = await readFile(this.metadataPathFor(artifactId, runId), 'utf8');
      const parsed = JSON.parse(raw) as ArtifactProps;
      return Artifact.fromJSON(parsed);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  async listByRun(runId?: string | null): Promise<Artifact[]> {
    const directory = this.runDirectory(runId);
    await mkdir(directory, { recursive: true });
    const entries = await readdir(directory, { withFileTypes: true });
    const artifacts = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.artifact.json'))
        .map(async (entry) => {
          const artifactId = entry.name.replace(/\.artifact\.json$/u, '');
          return this.get(artifactId, runId);
        }),
    );

    return artifacts
      .filter((artifact): artifact is Artifact => Boolean(artifact))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
}
