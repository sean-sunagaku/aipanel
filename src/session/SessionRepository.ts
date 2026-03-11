import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Session, type SessionProps } from "../domain/session.js";

interface SessionRepositoryOptions {
  storageRoot?: string;
}

interface SessionDocument {
  session: SessionProps;
}

export class SessionRepository {
  private readonly storageRoot: string;

  constructor(options: SessionRepositoryOptions = {}) {
    this.storageRoot =
      options.storageRoot ?? path.join(process.cwd(), ".aipanel");
  }

  async save(session: Session): Promise<Session> {
    const sessionsDirectory = path.join(this.storageRoot, "sessions");
    const filePath = path.join(sessionsDirectory, `${session.sessionId}.json`);
    await mkdir(sessionsDirectory, { recursive: true });
    const document: SessionDocument = { session: session.toJSON() };
    await writeFile(filePath, JSON.stringify(document, null, 2), "utf8");
    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    const sessionsDirectory = path.join(this.storageRoot, "sessions");
    const filePath = path.join(sessionsDirectory, `${sessionId}.json`);
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as SessionDocument | SessionProps;
      return Session.fromJSON("session" in parsed ? parsed.session : parsed);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async require(sessionId: string): Promise<Session> {
    const session = await this.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return session;
  }
}
