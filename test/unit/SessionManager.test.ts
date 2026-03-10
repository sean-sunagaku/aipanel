import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { SessionManager, SessionRepository } from "../../src/session/index.js";

test("SessionManager persists turns and provider refs", async () => {
  const storageRoot = await mkdtemp(path.join(os.tmpdir(), "aipanel-session-"));

  try {
    const repository = new SessionRepository({ storageRoot });
    const manager = new SessionManager({ repository });

    const session = await manager.startOrResume({ title: "Session test" });
    await manager.appendUserTurn(session, "How does this work?");
    await manager.appendAssistantTurn(session, "It works like this.", ["artifact_1"]);
    await manager.updateProviderRef(session, {
      provider: "claude-code",
      providerSessionId: "provider-session-1",
      workingDirectory: "/tmp/project",
    });

    const resumed = await manager.startOrResume({ sessionId: session.sessionId });
    const sessionFile = path.join(storageRoot, "sessions", `${session.sessionId}.json`);

    await access(sessionFile);
    assert.equal(resumed.turns.length, 2);
    assert.equal(resumed.providerRefs.length, 1);
    assert.equal(resumed.providerRefs[0]?.providerSessionId, "provider-session-1");

    const raw = JSON.parse(await readFile(sessionFile, "utf8")) as {
      session: {
        turns: Array<{ role: string; content: string }>;
      };
    };

    assert.deepEqual(
      raw.session.turns.map((turn) => turn.role),
      ["user", "assistant"],
    );
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
});
