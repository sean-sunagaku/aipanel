import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { Run, type RunProps } from "../../src/domain/run.js";
import { Session, type SessionProps } from "../../src/domain/session.js";
import { RunRepository } from "../../src/run/RunRepository.js";
import { SessionRepository } from "../../src/session/SessionRepository.js";
import { getRecord, parseJsonRecord } from "../support/jsonRecord.js";

test("Shared repository supports wrapped and unwrapped run/session records", async () => {
  const storageRoot = await mkdtemp(
    path.join(os.tmpdir(), "aipanel-repo-shared-"),
  );

  try {
    const session = Session.create({ title: "Repository test session" });
    const run = Run.create({
      command: "consult",
      mode: "direct",
      sessionId: session.sessionId,
    });

    const runLegacy: RunProps = run.toJSON();
    const sessionLegacy: SessionProps = session.toJSON();
    const legacyRunId = "run-legacy";
    const legacySessionId = "session-legacy";

    const runRepository = new RunRepository({ storageRoot });
    const sessionRepository = new SessionRepository({ storageRoot });

    await runRepository.save(run);
    await sessionRepository.save(session);

    const savedRunPath = path.join(storageRoot, "runs", `${run.runId}.json`);
    const savedSessionPath = path.join(
      storageRoot,
      "sessions",
      `${session.sessionId}.json`,
    );

    const savedRun = parseJsonRecord(await readFile(savedRunPath, "utf8"));
    const savedSession = parseJsonRecord(
      await readFile(savedSessionPath, "utf8"),
    );

    assert.deepEqual(Object.keys(savedRun), ["run"]);
    assert.deepEqual(Object.keys(savedSession), ["session"]);
    getRecord(savedRun, "run");
    getRecord(savedSession, "session");
    assert.equal((await runRepository.get(run.runId))?.runId, run.runId);
    assert.equal(
      (await sessionRepository.get(session.sessionId))?.sessionId,
      session.sessionId,
    );

    const legacyRunPath = path.join(storageRoot, "runs", `${legacyRunId}.json`);
    const legacySessionPath = path.join(
      storageRoot,
      "sessions",
      `${legacySessionId}.json`,
    );
    await writeFile(legacyRunPath, JSON.stringify(runLegacy, null, 2), "utf8");
    await writeFile(
      legacySessionPath,
      JSON.stringify(sessionLegacy, null, 2),
      "utf8",
    );

    assert.equal((await runRepository.get(legacyRunId))?.command, run.command);
    assert.equal(
      (await sessionRepository.get(legacySessionId))?.title,
      session.title,
    );
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
});

test("Shared repository returns null for not found and require throws", async () => {
  const storageRoot = await mkdtemp(
    path.join(os.tmpdir(), "aipanel-repo-notfound-"),
  );

  try {
    const runRepository = new RunRepository({ storageRoot });
    const sessionRepository = new SessionRepository({ storageRoot });

    const missingRun = await runRepository.get("missing-run-id");
    const missingSession = await sessionRepository.get("missing-session-id");

    assert.equal(missingRun, null);
    assert.equal(missingSession, null);
    await assert.rejects(
      async () => sessionRepository.require("missing-session-id"),
      { message: "Session not found: missing-session-id" },
    );
    await assert.rejects(async () => runRepository.require("missing-run-id"), {
      message: "Run not found: missing-run-id",
    });
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
});

test("Shared repository reports invalid record format with details", async () => {
  const storageRoot = await mkdtemp(
    path.join(os.tmpdir(), "aipanel-repo-invalid-record-"),
  );

  try {
    const runRepository = new RunRepository({ storageRoot });
    const sessionRepository = new SessionRepository({ storageRoot });

    const invalidRunPath = path.join(storageRoot, "runs", "invalid-run.json");
    const invalidSessionPath = path.join(
      storageRoot,
      "sessions",
      "invalid-session.json",
    );
    await mkdir(path.join(storageRoot, "runs"), { recursive: true });
    await mkdir(path.join(storageRoot, "sessions"), { recursive: true });

    await writeFile(
      invalidRunPath,
      JSON.stringify(
        {
          run: {
            runId: 123,
            command: "consult",
            mode: "direct",
            status: "created",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await writeFile(
      invalidSessionPath,
      JSON.stringify(
        {
          session: {
            sessionId: "session-1",
            title: 123,
            status: "active",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await assert.rejects(async () => runRepository.get("invalid-run"), {
      message: /Run record is invalid: "runId must be a string"/,
    });
    await assert.rejects(async () => sessionRepository.get("invalid-session"), {
      message: /Session record is invalid: "title must be a string"/,
    });
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
});
