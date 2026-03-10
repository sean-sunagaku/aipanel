import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Run, type RunProps } from "../domain/index.js";

export interface RunRepositoryOptions {
  storageRoot?: string;
}

interface RunDocument {
  run: RunProps;
}

export class RunRepository {
  private readonly storageRoot: string;

  constructor(options: RunRepositoryOptions = {}) {
    this.storageRoot = options.storageRoot ?? path.join(process.cwd(), '.aipanel');
  }

  get runsDirectory(): string {
    return path.join(this.storageRoot, 'runs');
  }

  filePathFor(runId: string): string {
    return path.join(this.runsDirectory, `${runId}.json`);
  }

  async save(run: Run): Promise<Run> {
    await mkdir(this.runsDirectory, { recursive: true });
    const document: RunDocument = { run: run.toJSON() };
    await writeFile(this.filePathFor(run.runId), JSON.stringify(document, null, 2), 'utf8');
    return run;
  }

  async get(runId: string): Promise<Run | null> {
    try {
      const raw = await readFile(this.filePathFor(runId), 'utf8');
      const parsed = JSON.parse(raw) as RunDocument | RunProps;
      return Run.fromJSON('run' in parsed ? parsed.run : parsed);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  async require(runId: string): Promise<Run> {
    const run = await this.get(runId);

    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    return run;
  }

  async list(): Promise<Run[]> {
    await mkdir(this.runsDirectory, { recursive: true });
    const entries = await readdir(this.runsDirectory, { withFileTypes: true });
    const runs = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map(async (entry) => {
          const runId = entry.name.replace(/\.json$/u, '');
          return this.get(runId);
        }),
    );

    return runs
      .filter((run): run is Run => Boolean(run))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
}
