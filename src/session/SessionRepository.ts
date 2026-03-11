import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Session, type SessionProps } from "../domain/session.js";

interface SessionRepositoryOptions {
  storageRoot?: string;
}

interface SessionDocument {
  session: SessionProps;
}

/**
 * Session の保存と復元を担当する。
 * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
 */
export class SessionRepository {
  private readonly storageRoot: string;

  constructor(options: SessionRepositoryOptions = {}) {
    this.storageRoot =
      options.storageRoot ?? path.join(process.cwd(), ".aipanel");
  }

  /**
   * 対象 を永続化する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param session 処理に渡す session。
   * @returns Session を解決する Promise。
   */
  async save(session: Session): Promise<Session> {
    const sessionsDirectory = path.join(this.storageRoot, "sessions");
    const filePath = path.join(sessionsDirectory, `${session.sessionId}.json`);
    await mkdir(sessionsDirectory, { recursive: true });
    const document: SessionDocument = { session: session.toJSON() };
    await writeFile(filePath, JSON.stringify(document, null, 2), "utf8");
    return session;
  }

  /**
   * 対象の値 を取得する。
   * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
   *
   * @param sessionId 対象を識別する ID。
   * @returns Session | null を解決する Promise。
   * @throws 入力や参照先が前提を満たさない場合。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  async get(sessionId: string): Promise<Session | null> {
    const sessionsDirectory = path.join(this.storageRoot, "sessions");
    const filePath = path.join(sessionsDirectory, `${sessionId}.json`);
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "session" in parsed) {
        return Session.fromJSON(parsed.session);
      }

      return Session.fromJSON(parsed);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const code = Object.getOwnPropertyDescriptor(error, "code")?.value;
        if (code === "ENOENT") {
          return null;
        }
      }

      throw error;
    }
  }

  /**
   * 条件 を必須として検証する。
   * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
   *
   * @param sessionId 対象を識別する ID。
   * @returns Session を解決する Promise。
   * @throws 入力や参照先が前提を満たさない場合。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  async require(sessionId: string): Promise<Session> {
    const session = await this.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return session;
  }
}
