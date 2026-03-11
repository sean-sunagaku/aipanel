/**
 * SessionRepository を定義する。
 * このファイルは、Session record の保存・取得・validation を repository に集め、会話履歴の保存規約を session manager から分離するために存在する。
 */

import { Session, type SessionProps } from "../domain/session.js";
import { JsonRepository } from "../shared/json-repository.js";

interface SessionRepositoryOptions {
  storageRoot?: string;
}

/**
 * Session の永続化境界を定義する。
 * 継続会話の正本管理と保存規約を session 層へ置き、followup が provider native state に依存しないようにする。
 */
export class SessionRepository {
  private readonly repository: JsonRepository<Session, SessionProps>;

  public constructor(options: SessionRepositoryOptions = {}) {
    this.repository = new JsonRepository(
      {
        collectionName: "sessions",
        envelopeKey: "session",
        entityName: "Session",
        getId: (entity: Session): string => entity.sessionId,
        serialize: (entity: Session): SessionProps => entity.toJSON(),
        deserialize: (record: unknown): Session => {
          if (!isSessionProps(record)) {
            throw new Error("Invalid session record");
          }

          return Session.fromJSON(record);
        },
        validateRecord: collectSessionRecordIssues,
      },
      options,
    );
  }

  /**
   * 対象 を永続化する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param session 処理に渡す session。
   * @returns Session を解決する Promise。
   */
  public async save(session: Session): Promise<Session> {
    return this.repository.save(session);
  }

  /**
   * 対象の値 を取得する。
   * 継続会話の正本管理と保存規約を session 層へ置き、followup が provider native state に依存しないようにする。
   *
   * @param sessionId 対象を識別する ID。
   * @returns Session | null を解決する Promise。
   */
  public async get(sessionId: string): Promise<Session | null> {
    return this.repository.get(sessionId);
  }

  /**
   * 条件 を必須として検証する。
   * 継続会話の正本管理と保存規約を session 層へ置き、followup が provider native state に依存しないようにする。
   *
   * @param sessionId 対象を識別する ID。
   * @returns Session を解決する Promise。
   */
  public async require(sessionId: string): Promise<Session> {
    return this.repository.require(sessionId);
  }
}

/**
 * Session Props を満たすか判定する。
 * 継続会話の正本管理と保存規約を session 層へ置き、followup が provider native state に依存しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns value is SessionProps。
 */
function isSessionProps(value: unknown): value is SessionProps {
  return collectSessionRecordIssues(value).length === 0;
}

/**
 * Session Record Issues を集めて束ねる。
 * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
 *
 * @param value 処理に渡す value。
 * @returns 収集した string の一覧。
 * @remarks 入力条件ごとの差分をここで吸収しているため、分岐を削るときは呼び出し側へ責務を漏らさないか確認する。
 */
function collectSessionRecordIssues(value: unknown): string[] {
  const record = asRecord(value);
  const issues: string[] = [];

  if (!record) {
    return ["record is not an object"];
  }

  if (typeof record.sessionId !== "string") {
    issues.push("sessionId must be a string");
  }

  if (typeof record.title !== "string") {
    issues.push("title must be a string");
  }

  if (!isActiveStatus(record.status)) {
    issues.push('status must be "active"');
  }

  if (typeof record.createdAt !== "string") {
    issues.push("createdAt must be a string");
  }

  if (typeof record.updatedAt !== "string") {
    issues.push("updatedAt must be a string");
  }

  if (record.turns !== undefined && !Array.isArray(record.turns)) {
    issues.push("turns must be an array when present");
  }

  if (
    record.schemaVersion !== undefined &&
    typeof record.schemaVersion !== "number"
  ) {
    issues.push("schemaVersion must be a number when present");
  }

  return issues;
}

/**
 * as Record を担当する。
 * 継続会話の正本管理と保存規約を session 層へ置き、followup が provider native state に依存しないようにする。
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
 * Active Status を満たすか判定する。
 * 継続会話の正本管理と保存規約を session 層へ置き、followup が provider native state に依存しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns value is "active"。
 */
function isActiveStatus(value: unknown): value is "active" {
  return value === "active";
}
