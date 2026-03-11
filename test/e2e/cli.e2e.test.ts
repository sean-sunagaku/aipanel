import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  parseConsultationPayload,
  parseDebugPayload,
  parseProvidersPayload,
  type ConsultationPayload,
} from "../support/cliPayloads.js";
import { createCliSandbox } from "../support/cliSandbox.js";
import {
  getArray,
  getFirstRecord,
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

test("E2E: built CLI can complete providers, consult, followup, and debug with persistent storage", async () => {
  const sandbox = await createCliSandbox("aipanel-e2e-");

  await writeFile(
    path.join(sandbox.workspace, "context.md"),
    "# Context\n\nSomething is failing.\n",
    "utf8",
  );
  await writeFile(
    path.join(sandbox.workspace, "error.log"),
    "ERROR dependency graph is stale\n",
    "utf8",
  );

  try {
    const providers = await runCli(
      process.execPath,
      [BUILT_CLI_PATH, "providers", "--json"],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(providers.exitCode, 0, providers.stderr);
    const providersPayload = parseProvidersPayload(providers.stdout);
    assert.deepEqual(providersPayload.providers, ["claude-code", "codex"]);

    const consult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Give a concise next step.",
        "--json",
        "--model",
        "claude-sonnet-4-5",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(consult.exitCode, 0, consult.stderr);
    const consultPayload = parseConsultationPayload(consult.stdout);
    assertConsultation(consultPayload, "claude-code", "claude-sonnet-4-5");

    const followup = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "followup",
        "--session",
        consultPayload.sessionId,
        "Now answer with one more short step.",
        "--json",
        "--model",
        "claude-sonnet-4-5",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(followup.exitCode, 0, followup.stderr);
    const followupPayload = parseConsultationPayload(followup.stdout);
    assert.equal(followupPayload.sessionId, consultPayload.sessionId);
    assert.equal(followupPayload.status, "completed");
    assert.equal(followupPayload.model, "claude-sonnet-4-5");

    const debug = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Diagnose the likely issue in one short paragraph.",
        "--json",
        "--model",
        "claude-opus-4-1",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(debug.exitCode, 0, debug.stderr);
    const debugPayload = parseDebugPayload(debug.stdout);
    assert.equal(debugPayload.status, "completed");
    assert.equal(debugPayload.provider, "claude-code");
    assert.equal(debugPayload.model, "claude-opus-4-1");
    assert.equal(debugPayload.details.length, 3);

    const sessionDocument = await readStoredRecord(
      sandbox.storageRoot,
      "sessions",
      consultPayload.sessionId,
    );
    assert.equal(
      getArray(getRecord(sessionDocument, "session"), "turns").length,
      4,
    );

    const debugRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      debugPayload.runId,
    );
    const debugRunRecord = getRecord(debugRunDocument, "run");
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
    assert.equal(
      getString(comparisonReport, "topic"),
      "Diagnose the likely issue in one short paragraph.",
    );
  } finally {
    await sandbox.cleanup();
  }
});

test("E2E: built CLI can use codex when explicitly selected", async () => {
  const sandbox = await createCliSandbox("aipanel-e2e-codex-");

  await writeFile(
    path.join(sandbox.workspace, "context.md"),
    "# Context\n\nCodex provider path.\n",
    "utf8",
  );
  await writeFile(
    path.join(sandbox.workspace, "error.log"),
    "WARN review budget nearly exhausted\n",
    "utf8",
  );

  try {
    const consult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Give the highest-priority review note.",
        "--json",
        "--provider",
        "codex",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(consult.exitCode, 0, consult.stderr);
    const consultPayload = parseConsultationPayload(consult.stdout);
    assertConsultation(consultPayload, "codex", "configured-default");
    assert.match(consultPayload.answer, /Codex answer/);

    const followup = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "followup",
        "--session",
        consultPayload.sessionId,
        "Now summarize the followup risk.",
        "--json",
        "--provider",
        "codex",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(followup.exitCode, 0, followup.stderr);
    const followupPayload = parseConsultationPayload(followup.stdout);
    assert.equal(followupPayload.provider, "codex");
    assert.equal(followupPayload.model, "configured-default");

    const debug = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Review the likely regression in one paragraph.",
        "--json",
        "--provider",
        "codex",
        "--model",
        "codex-reviewer",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(debug.exitCode, 0, debug.stderr);
    const debugPayload = parseDebugPayload(debug.stdout);
    assert.equal(debugPayload.provider, "codex");
    assert.equal(debugPayload.model, "codex-reviewer");
    assert.equal(debugPayload.details.length, 3);

    const debugRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      debugPayload.runId,
    );
    const debugRunRecord = getRecord(debugRunDocument, "run");
    assert.deepEqual(
      getRecordArray(debugRunRecord, "providerResponses").map((response) =>
        getString(response, "model"),
      ),
      ["codex-reviewer", "codex-reviewer", "codex-reviewer"],
    );
  } finally {
    await sandbox.cleanup();
  }
});

test("E2E: built CLI follows explicit --model and keeps override behavior", async () => {
  const sandbox = await createCliSandbox("aipanel-e2e-model-");

  await writeFile(
    path.join(sandbox.workspace, "context.md"),
    "# Context\n\nModel routing check.\n",
    "utf8",
  );

  try {
    const consult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Use an explicit model and verify it is used.",
        "--json",
        "--model",
        "claude-sonnet-4-5",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(consult.exitCode, 0, consult.stderr);
    const consultPayload = parseConsultationPayload(consult.stdout);
    assertConsultation(consultPayload, "claude-code", "claude-sonnet-4-5");
    assert.match(consultPayload.answer, /Model used: claude-sonnet-4-5/);

    const consultRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      consultPayload.runId,
    );
    const consultRunRecord = getRecord(consultRunDocument, "run");
    assert.deepEqual(
      getRecordArray(consultRunRecord, "providerResponses").map((response) =>
        getString(response, "model"),
      ),
      ["claude-sonnet-4-5"],
    );

    const debug = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Override the explicit model for debug.",
        "--json",
        "--model",
        "claude-opus-4-1",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(debug.exitCode, 0, debug.stderr);
    const debugPayload = parseDebugPayload(debug.stdout);
    assert.equal(debugPayload.model, "claude-opus-4-1");
    assert.match(debugPayload.details[0] ?? "", /Model used: claude-opus-4-1/);

    const debugRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      debugPayload.runId,
    );
    const debugRunRecord = getRecord(debugRunDocument, "run");
    assert.deepEqual(
      getRecordArray(debugRunRecord, "providerResponses").map((response) =>
        getString(response, "model"),
      ),
      ["claude-opus-4-1", "claude-opus-4-1", "claude-opus-4-1"],
    );
  } finally {
    await sandbox.cleanup();
  }
});

function assertConsultation(
  payload: ConsultationPayload,
  provider: string,
  model: string,
): void {
  assert.equal(payload.kind, "consultation");
  assert.equal(payload.provider, provider);
  assert.equal(payload.model, model);
  assert.equal(payload.status, "completed");
}
