import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  parseConsultationPayload,
  parseDebugPayload,
  type ConsultationPayload,
} from "../support/cliPayloads.js";
import { createCliSandbox } from "../support/cliSandbox.js";
import {
  getArray,
  getFirstRecord,
  getOptionalString,
  getRecord,
  getRecordArray,
  getString,
  parseJsonRecord,
} from "../support/jsonRecord.js";
import { runCli } from "../support/runCli.js";
import { BUILT_CLI_PATH, REPO_ROOT } from "../support/testPaths.js";

function readStoredRecord(
  storageRoot: string,
  directory: "sessions" | "runs",
  id: string,
): Promise<Record<string, unknown>> {
  return readFile(path.join(storageRoot, directory, `${id}.json`), "utf8").then(
    (text) => parseJsonRecord(text),
  );
}

test("CLI providers, consult, followup, and debug flows work end-to-end", async () => {
  const sandbox = await createCliSandbox("aipanel-cli-");

  await writeFile(
    path.join(sandbox.workspace, "note.txt"),
    "cache invalidation notes\n",
    "utf8",
  );
  await writeFile(
    path.join(sandbox.workspace, "change.diff"),
    "--- a\n+++ b\n@@\n-cache\n+fresh cache\n",
    "utf8",
  );
  await writeFile(
    path.join(sandbox.workspace, "app.log"),
    "ERROR cache refresh skipped\n",
    "utf8",
  );

  try {
    const providersResult = await runCli(
      process.execPath,
      [BUILT_CLI_PATH, "providers", "--json"],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(providersResult.exitCode, 0, providersResult.stderr);
    assert.deepEqual(JSON.parse(providersResult.stdout), {
      kind: "providers",
      providers: ["claude-code", "codex"],
    });

    const consultResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "How should we proceed?",
        "--json",
        "--model",
        "claude-sonnet-4-5",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(consultResult.exitCode, 0, consultResult.stderr);
    const consultation = parseConsultationPayload(consultResult.stdout);
    assertConsultation(consultation, {
      provider: "claude-code",
      model: "claude-sonnet-4-5",
      answerPattern: /Practical answer/,
      modelPattern: /Model used: claude-sonnet-4-5/,
    });

    const sessionDocument = await readStoredRecord(
      sandbox.storageRoot,
      "sessions",
      consultation.sessionId,
    );
    const sessionRecord = getRecord(sessionDocument, "session");
    assert.equal(getArray(sessionRecord, "turns").length, 2);

    const consultRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      consultation.runId,
    );
    const consultRunRecord = getRecord(consultRunDocument, "run");
    assert.equal(getString(consultRunRecord, "mode"), "direct");
    const firstConsultProviderResponse = getFirstRecord(
      consultRunRecord,
      "providerResponses",
    );
    assert.equal(
      getString(firstConsultProviderResponse, "provider"),
      "claude-code",
    );
    assert.equal(
      getString(firstConsultProviderResponse, "model"),
      "claude-sonnet-4-5",
    );
    const firstRunContext = getFirstRecord(consultRunRecord, "runContexts");
    assert.equal(
      getString(firstRunContext, "question"),
      "How should we proceed?",
    );
    await access(getOptionalString(firstRunContext, "artifactPath") ?? "");

    const followupResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "followup",
        "--session",
        consultation.sessionId,
        "What should we verify next?",
        "--json",
        "--model",
        "claude-sonnet-4-5",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(followupResult.exitCode, 0, followupResult.stderr);
    const followup = parseConsultationPayload(followupResult.stdout);
    assert.equal(followup.sessionId, consultation.sessionId);
    assert.equal(followup.model, "claude-sonnet-4-5");

    const followedSessionDocument = await readStoredRecord(
      sandbox.storageRoot,
      "sessions",
      consultation.sessionId,
    );
    assert.equal(
      getArray(getRecord(followedSessionDocument, "session"), "turns").length,
      4,
    );

    const debugResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Why is the build red?",
        "--json",
        "--model",
        "claude-opus-4-1",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(debugResult.exitCode, 0, debugResult.stderr);
    const debugPayload = parseDebugPayload(debugResult.stdout);
    assert.equal(debugPayload.kind, "debug");
    assert.equal(debugPayload.provider, "claude-code");
    assert.equal(debugPayload.model, "claude-opus-4-1");
    assert.equal(debugPayload.status, "completed");
    assert.equal(debugPayload.details.length, 3);
    assert.match(debugPayload.details[0] ?? "", /Model used: claude-opus-4-1/);

    const debugRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      debugPayload.runId,
    );
    const debugRunRecord = getRecord(debugRunDocument, "run");
    assert.equal(getString(debugRunRecord, "mode"), "orchestrated");
    assert.deepEqual(
      getRecordArray(debugRunRecord, "tasks").map((task) =>
        getString(task, "role"),
      ),
      ["planner", "reviewer", "validator"],
    );
    assert.deepEqual(
      getRecordArray(debugRunRecord, "providerResponses").map((response) =>
        getString(response, "model"),
      ),
      ["claude-opus-4-1", "claude-opus-4-1", "claude-opus-4-1"],
    );
    const comparisonReport = getFirstRecord(
      debugRunRecord,
      "comparisonReports",
    );
    assert.equal(getString(comparisonReport, "topic"), "Why is the build red?");
    const debugRunContext = getFirstRecord(debugRunRecord, "runContexts");
    assert.equal(
      getString(debugRunContext, "question"),
      "Why is the build red?",
    );
    await access(getOptionalString(debugRunContext, "artifactPath") ?? "");
  } finally {
    await sandbox.cleanup();
  }
});

test("CLI supports codex consult, followup, and debug through exec flow", async () => {
  const sandbox = await createCliSandbox("aipanel-cli-codex-");

  await writeFile(
    path.join(sandbox.workspace, "note.txt"),
    "investigate the flaky reviewer flow\n",
    "utf8",
  );
  await writeFile(
    path.join(sandbox.workspace, "app.log"),
    "WARN retry budget almost exhausted\n",
    "utf8",
  );

  try {
    const consultResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Review the likely issue and next step.",
        "--json",
        "--provider",
        "codex",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(consultResult.exitCode, 0, consultResult.stderr);
    const consultation = parseConsultationPayload(consultResult.stdout);
    assertConsultation(consultation, {
      provider: "codex",
      model: "configured-default",
      answerPattern: /Codex answer/,
      modelPattern: /Model used: configured-default/,
    });

    const sessionDocument = await readStoredRecord(
      sandbox.storageRoot,
      "sessions",
      consultation.sessionId,
    );
    assert.equal(
      getArray(getRecord(sessionDocument, "session"), "turns").length,
      2,
    );

    const followupResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "followup",
        "--session",
        consultation.sessionId,
        "Keep the followup concise.",
        "--json",
        "--provider",
        "codex",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(followupResult.exitCode, 0, followupResult.stderr);
    const followup = parseConsultationPayload(followupResult.stdout);
    assert.equal(followup.provider, "codex");
    assert.equal(followup.model, "configured-default");

    const debugResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Review the failure mode in one short paragraph.",
        "--json",
        "--provider",
        "codex",
        "--model",
        "codex-pro",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(debugResult.exitCode, 0, debugResult.stderr);
    const debugPayload = parseDebugPayload(debugResult.stdout);
    assert.equal(debugPayload.provider, "codex");
    assert.equal(debugPayload.model, "codex-pro");
    assert.equal(debugPayload.details.length, 3);
    assert.match(debugPayload.details[0] ?? "", /Model used: codex-pro/);

    const debugRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      debugPayload.runId,
    );
    const debugRunRecord = getRecord(debugRunDocument, "run");
    assert.deepEqual(
      getRecordArray(debugRunRecord, "providerResponses").map((response) =>
        getString(response, "provider"),
      ),
      ["codex", "codex", "codex"],
    );
    assert.deepEqual(
      getRecordArray(debugRunRecord, "providerResponses").map((response) =>
        getString(response, "model"),
      ),
      ["codex-pro", "codex-pro", "codex-pro"],
    );
  } finally {
    await sandbox.cleanup();
  }
});

function assertConsultation(
  payload: ConsultationPayload,
  options: {
    provider: string;
    model: string;
    answerPattern: RegExp;
    modelPattern: RegExp;
  },
): void {
  assert.equal(payload.kind, "consultation");
  assert.equal(payload.provider, options.provider);
  assert.equal(payload.model, options.model);
  assert.equal(payload.status, "completed");
  assert.match(payload.answer, options.answerPattern);
  assert.match(payload.answer, options.modelPattern);
}
