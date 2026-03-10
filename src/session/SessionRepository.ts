import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Session, type SessionProps } from "../domain/index.js";

export interface SessionRepositoryOptions {
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

  get sessionsDirectory(): string {
    return path.join(this.storageRoot, "sessions");
  }

  filePathFor(sessionId: string): string {
    return path.join(this.sessionsDirectory, `${sessionId}.json`);
  }

  async save(session: Session): Promise<Session> {
    await mkdir(this.sessionsDirectory, { recursive: true });
    const document: SessionDocument = { session: session.toJSON() };
    await writeFile(
      this.filePathFor(session.sessionId),
      JSON.stringify(document, null, 2),
      "utf8",
    );
    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    try {
      const raw = await readFile(this.filePathFor(sessionId), "utf8");
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

  async list(): Promise<Session[]> {
    await mkdir(this.sessionsDirectory, { recursive: true });
    const entries = await readdir(this.sessionsDirectory, {
      withFileTypes: true,
    });
    const sessions = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const sessionId = entry.name.replace(/\.json$/u, "");
          return this.get(sessionId);
        }),
    );

    return sessions
      .filter((session): session is Session => Boolean(session))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
}
