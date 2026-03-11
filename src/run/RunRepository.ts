/**
 * RunRepository を定義する。
 * このファイルは、Run ledger の保存・取得・record validation を repository に集め、永続化形式を use case や coordinator へ漏らさないために存在する。
 */

import {
  Run,
  type RunProps,
  isRunCommand,
  isRunMode,
  isRunReviewStatus,
  isRunStatus,
} from "../domain/run.js";
import { JsonRepository } from "../shared/json-repository.js";

interface RunRepositoryOptions {
  storageRoot?: string;
}

/**
 * Run の永続化境界を定義する。
 * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
 */
export class RunRepository {
  private readonly repository: JsonRepository<Run, RunProps>;

  public constructor(options: RunRepositoryOptions = {}) {
    this.repository = new JsonRepository(
      {
        collectionName: "runs",
        envelopeKey: "run",
        entityName: "Run",
        getId: (entity: Run): string => entity.runId,
        serialize: (entity: Run): RunProps => entity.toJSON(),
        deserialize: (record: unknown): Run => {
          if (!isRunProps(record)) {
            throw new Error("Invalid run record");
          }

          return Run.fromJSON(record);
        },
        validateRecord: collectRunRecordIssues,
      },
      options,
    );
  }

  /**
   * 対象 を永続化する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param run 処理に渡す run。
   * @returns Run を解決する Promise。
   */
  public async save(run: Run): Promise<Run> {
    return this.repository.save(run);
  }

  /**
   * 対象の値 を取得する。
   * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
   *
   * @param runId 対象を識別する ID。
   * @returns Run | null を解決する Promise。
   */
  public async get(runId: string): Promise<Run | null> {
    return this.repository.get(runId);
  }

  /**
   * 条件 を必須として検証する。
   * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
   *
   * @param runId 対象を識別する ID。
   * @returns Run を解決する Promise。
   */
  public async require(runId: string): Promise<Run> {
    return this.repository.require(runId);
  }
}

/**
 * Run Props を満たすか判定する。
 * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns value is RunProps。
 */
function isRunProps(value: unknown): value is RunProps {
  return collectRunRecordIssues(value).length === 0;
}

/**
 * Run Record Issues を集めて束ねる。
 * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
 *
 * @param value 処理に渡す value。
 * @returns 収集した string の一覧。
 * @remarks 入力条件ごとの差分をここで吸収しているため、分岐を削るときは呼び出し側へ責務を漏らさないか確認する。
 */
function collectRunRecordIssues(value: unknown): string[] {
  const record = asRecord(value);
  const issues: string[] = [];

  if (!record) {
    return ["record is not an object"];
  }

  if (!isString(record.runId)) {
    issues.push("runId must be a string");
  }

  if (!isString(record.command)) {
    issues.push("command must be a string");
  }

  if (!isString(record.mode)) {
    issues.push("mode must be a string");
  } else if (!isRunMode(record.mode)) {
    issues.push("mode must be one of the supported run modes");
  }

  if (!isRunStatus(record.status)) {
    issues.push("status must be a valid RunStatus");
  }

  if (!isString(record.command) || !isRunCommand(record.command)) {
    issues.push("command must be one of the supported run commands");
  }

  if (!isString(record.createdAt)) {
    issues.push("createdAt must be a string");
  }

  if (!isString(record.updatedAt)) {
    issues.push("updatedAt must be a string");
  }

  if (record.sessionId !== undefined && !isStringOrNull(record.sessionId)) {
    issues.push("sessionId must be a string or null");
  }

  if (
    record.finalSummary !== undefined &&
    !isStringOrNull(record.finalSummary)
  ) {
    issues.push("finalSummary must be a string or null");
  }

  if (
    record.reviewStatus !== undefined &&
    !isRunReviewStatus(record.reviewStatus) &&
    record.reviewStatus !== null
  ) {
    issues.push("reviewStatus must be a string or null");
  }

  if (record.tasks !== undefined && !Array.isArray(record.tasks)) {
    issues.push("tasks must be an array when present");
  }

  if (record.taskResults !== undefined && !Array.isArray(record.taskResults)) {
    issues.push("taskResults must be an array when present");
  }

  if (record.runContexts !== undefined && !Array.isArray(record.runContexts)) {
    issues.push("runContexts must be an array when present");
  }

  if (
    record.providerResponses !== undefined &&
    !Array.isArray(record.providerResponses)
  ) {
    issues.push("providerResponses must be an array when present");
  }

  if (
    record.normalizedResponses !== undefined &&
    !Array.isArray(record.normalizedResponses)
  ) {
    issues.push("normalizedResponses must be an array when present");
  }

  if (
    record.comparisonReports !== undefined &&
    !Array.isArray(record.comparisonReports)
  ) {
    issues.push("comparisonReports must be an array when present");
  }

  if (record.schemaVersion !== undefined && !isNumber(record.schemaVersion)) {
    issues.push("schemaVersion must be a number when present");
  }

  return issues;
}

/**
 * as Record を担当する。
 * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns Record<string, unknown> | null。
 * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = item;
  }

  return result;
}

/**
 * String を満たすか判定する。
 * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns value is string。
 */
function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Number を満たすか判定する。
 * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns value is number。
 */
function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

/**
 * String Or Null を満たすか判定する。
 * Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns value is string | null。
 */
function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}
