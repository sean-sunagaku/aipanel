import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { SessionManager } from "../../src/session/SessionManager.js";
import { SessionRepository } from "../../src/session/SessionRepository.js";
import {
  assertRecord,
  getArray,
  getRecord,
  parseJsonRecord,
} from "../support/jsonRecord.js";

test("SessionManager persists turns", async () => {
  const storageRoot = await mkdtemp(path.join(os.tmpdir(), "aipanel-session-"));

  try {
    const repository = new SessionRepository({ storageRoot });
    const manager = new SessionManager({ repository });

    const session = await manager.startOrResume({ title: "Session test" });
    await manager.appendUserTurn(session, "How does this work?");
    await manager.appendAssistantTurn(session, "It works like this.", [
      "artifact_1",
    ]);
    const resumed = await manager.startOrResume({
      sessionId: session.sessionId,
    });
    const sessionFile = path.join(
      storageRoot,
      "sessions",
      `${session.sessionId}.json`,
    );

    await access(sessionFile);
    assert.equal(resumed.turns.length, 2);

    const raw = parseJsonRecord(await readFile(sessionFile, "utf8"));
    const rawSession = getRecord(raw, "session");
    assert.deepEqual(
      getArray(rawSession, "turns").map((turn) => {
        assertRecord(turn);
        return turn.role;
      }),
      ["user", "assistant"],
    );
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
});
