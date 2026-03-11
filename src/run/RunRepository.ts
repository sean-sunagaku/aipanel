import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Run, type RunProps } from "../domain/run.js";

interface RunRepositoryOptions {
  storageRoot?: string;
}

interface RunDocument {
  run: RunProps;
}

export class RunRepository {
  private readonly storageRoot: string;

  constructor(options: RunRepositoryOptions = {}) {
    this.storageRoot =
      options.storageRoot ?? path.join(process.cwd(), ".aipanel");
  }

  async save(run: Run): Promise<Run> {
    const runsDirectory = path.join(this.storageRoot, "runs");
    const filePath = path.join(runsDirectory, `${run.runId}.json`);
    await mkdir(runsDirectory, { recursive: true });
    const document: RunDocument = { run: run.toJSON() };
    await writeFile(
      filePath,
      JSON.stringify(document, null, 2),
      "utf8",
    );
    return run;
  }
}
