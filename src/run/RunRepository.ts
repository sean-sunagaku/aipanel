import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Run, type RunProps } from "../domain/run.js";

interface RunRepositoryOptions {
  storageRoot?: string;
}

interface RunDocument {
  run: RunProps;
}

/**
 * Run の保存と復元を担当する。
 * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
 */
export class RunRepository {
  private readonly storageRoot: string;

  constructor(options: RunRepositoryOptions = {}) {
    this.storageRoot =
      options.storageRoot ?? path.join(process.cwd(), ".aipanel");
  }

  /**
   * 対象 を永続化する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param run 処理に渡す run。
   * @returns Run を解決する Promise。
   */
  async save(run: Run): Promise<Run> {
    const runsDirectory = path.join(this.storageRoot, "runs");
    const filePath = path.join(runsDirectory, `${run.runId}.json`);
    await mkdir(runsDirectory, { recursive: true });
    const document: RunDocument = { run: run.toJSON() };
    await writeFile(filePath, JSON.stringify(document, null, 2), "utf8");
    return run;
  }
}
