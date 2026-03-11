import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  parseBatchPayload,
  parsePlanBatchPayload,
  parseProvidersPayload,
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

test("E2E: built CLI can complete providers, consult, followup, debug, and plan with persistent storage", async () => {
  const sandbox = await createCliSandbox("aipanel-e2e-");
  const planPath = path.join(sandbox.workspace, "plan.md");

  await writeFile(
    path.join(sandbox.workspace, "context.md"),
    "# Context\n\nSomething is failing.\n",
    "utf8",
  );
  await writeFile(
    planPath,
    "# Release Plan\n\n1. Update the parser\n2. Add the use case\n3. Validate the CLI\n",
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
      [BUILT_CLI_PATH, "consult", "Give a concise next step.", "--json"],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(consult.exitCode, 0, consult.stderr);
    const consultPayload = parseBatchPayload(consult.stdout);
    assert.equal(consultPayload.command, "consult");
    const consultReview = consultPayload.results[0];
    assert.ok(consultReview);
    assert.equal(consultReview.provider, "claude-code");
    assert.equal(consultReview.output.kind, "consultation");
    assert.match(consultReview.output.answer, /Practical answer/);

    const followup = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "followup",
        "--session",
        consultReview.sessionId ?? "",
        "Now answer with one more short step.",
        "--json",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(followup.exitCode, 0, followup.stderr);
    const followupPayload = parseBatchPayload(followup.stdout);
    const followupReview = followupPayload.results[0];
    assert.ok(followupReview);
    assert.equal(followupReview.sessionId, consultReview.sessionId);

    const debug = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Diagnose the likely issue in one short paragraph.",
        "--json",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(debug.exitCode, 0, debug.stderr);
    const debugPayload = parseBatchPayload(debug.stdout);
    const debugReview = debugPayload.results[0];
    assert.ok(debugReview);
    assert.equal(debugReview.provider, "claude-code");
    assert.equal(debugReview.output.kind, "debug");
    assert.equal(debugReview.output.details.length, 3);

    const sessionDocument = await readStoredRecord(
      sandbox.storageRoot,
      "sessions",
      consultReview.sessionId ?? "",
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
    const comparisonReport = getFirstRecord(
      debugRunRecord,
      "comparisonReports",
    );
    assert.equal(
      getString(comparisonReport, "topic"),
      "Diagnose the likely issue in one short paragraph. (claude-code)",
    );

    const plan = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "plan",
        "Review this release plan.",
        "--file",
        planPath,
        "--json",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(plan.exitCode, 0, plan.stderr);
    const planPayload = parsePlanBatchPayload(plan.stdout);
    const planReview = planPayload.results[0];
    assert.ok(planReview);
    assert.equal(planReview.provider, "claude-code");
    assert.equal(planReview.output.kind, "plan");
    assert.equal(planReview.output.verdict, "good");
    assert.match(
      planReview.output.details.join("\n\n"),
      /Plan reviewed: # Release Plan/,
    );

    const planRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      planPayload.runId,
    );
    const planRunRecord = getRecord(planRunDocument, "run");
    assert.deepEqual(
      getRecordArray(planRunRecord, "tasks").map((task) =>
        getString(task, "role"),
      ),
      ["analyzer", "critic", "advisor"],
    );
    const planRunContext = getFirstRecord(planRunRecord, "runContexts");
    assert.equal(getString(planRunContext, "filePath"), planPath);
    assert.equal(
      getString(planRunContext, "sourceArtifactId").startsWith("artifact_"),
      true,
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
    const consultPayload = parseBatchPayload(consult.stdout);
    const consultReview = consultPayload.results[0];
    assert.ok(consultReview);
    assert.equal(consultReview.provider, "codex");
    assert.equal(consultReview.output.kind, "consultation");
    assert.match(consultReview.output.answer, /Codex answer/);

    const followup = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "followup",
        "--session",
        consultReview.sessionId ?? "",
        "Now summarize the followup risk.",
        "--json",
        "--provider",
        "codex",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(followup.exitCode, 0, followup.stderr);
    const followupPayload = parseBatchPayload(followup.stdout);
    const followupReview = followupPayload.results[0];
    assert.ok(followupReview);
    assert.equal(followupReview.provider, "codex");

    const debug = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Review the likely regression in one paragraph.",
        "--json",
        "--provider",
        "codex",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(debug.exitCode, 0, debug.stderr);
    const debugPayload = parseBatchPayload(debug.stdout);
    const debugReview = debugPayload.results[0];
    assert.ok(debugReview);
    assert.equal(debugReview.provider, "codex");
    assert.equal(debugReview.output.kind, "debug");
    assert.equal(debugReview.output.details.length, 3);

    const debugRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      debugPayload.runId,
    );
    getRecord(debugRunDocument, "run");
  } finally {
    await sandbox.cleanup();
  }
});

test("E2E: built CLI can fan out to multiple reviewers in one batch", async () => {
  const sandbox = await createCliSandbox("aipanel-e2e-multi-");

  await writeFile(
    path.join(sandbox.workspace, "context.md"),
    "# Context\n\nBatch routing check.\n",
    "utf8",
  );

  try {
    const consult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Compare the reviewers and keep the answer short.",
        "--json",
        "--provider",
        "claude-code",
        "--provider",
        "codex",
        "--provider",
        "codex",
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(consult.exitCode, 0, consult.stderr);
    const consultPayload = parseBatchPayload(consult.stdout);
    assert.equal(consultPayload.command, "consult");
    assert.equal(consultPayload.results.length, 3);
    assert.deepEqual(
      consultPayload.results.map((result) => result.provider),
      ["claude-code", "codex", "codex"],
    );

    const consultRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      consultPayload.runId,
    );
    const consultRunRecord = getRecord(consultRunDocument, "run");
    assert.deepEqual(
      getRecordArray(consultRunRecord, "providerResponses").map((response) =>
        getString(response, "provider"),
      ),
      ["claude-code", "codex", "codex"],
    );
  } finally {
    await sandbox.cleanup();
  }
});

test("E2E: built CLI renders plan text output and exits with code 2 for revise verdicts", async () => {
  const sandbox = await createCliSandbox("aipanel-e2e-plan-text-");
  const planPath = path.join(sandbox.workspace, "plan.md");

  await writeFile(
    planPath,
    "# FORCE_PLAN_REVISE\n\n1. Ship immediately\n2. Skip validation\n",
    "utf8",
  );

  try {
    const plan = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "plan",
        "Review this FORCE_PLAN_REVISE rollout.",
        "--file",
        planPath,
      ],
      { cwd: REPO_ROOT, env: sandbox.env },
    );
    assert.equal(plan.exitCode, 2, plan.stderr);
    assert.match(plan.stdout, /command: plan/);
    assert.match(plan.stdout, /status: completed/);
    assert.match(plan.stdout, /review: needs-review/);
    assert.match(plan.stdout, /verdict: revise/);
  } finally {
    await sandbox.cleanup();
  }
});
