import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  parseBatchPayload,
  parsePlanBatchPayload,
} from "../support/cliPayloads.js";
import { createCliSandbox } from "../support/cliSandbox.js";
import {
  getArray,
  getFirstRecord,
  getOptionalString,
  getRecord,
  getRecordArray,
  getString,
  getStringArray,
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

test("CLI providers, consult, followup, debug, and plan flows work end-to-end", async () => {
  const sandbox = await createCliSandbox("aipanel-cli-");
  const planPath = path.join(sandbox.workspace, "plan.md");

  await writeFile(
    path.join(sandbox.workspace, "note.txt"),
    "cache invalidation notes\n",
    "utf8",
  );
  await writeFile(
    planPath,
    "# Rollout Plan\n\n1. Add the new flag\n2. Update the router\n3. Verify with tests\n",
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
      [BUILT_CLI_PATH, "consult", "How should we proceed?", "--json"],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(consultResult.exitCode, 0, consultResult.stderr);
    const consultPayload = parseBatchPayload(consultResult.stdout);
    assert.equal(consultPayload.command, "consult");
    assert.equal(consultPayload.status, "completed");
    assert.equal(consultPayload.results.length, 1);
    const consultReview = consultPayload.results[0];
    assert.ok(consultReview);
    assert.equal(consultReview.provider, "claude-code");
    assert.equal(consultReview.output.kind, "consultation");
    assert.match(consultReview.output.answer, /Practical answer/);

    const consultSessionId = consultReview.sessionId ?? "";
    const sessionDocument = await readStoredRecord(
      sandbox.storageRoot,
      "sessions",
      consultSessionId,
    );
    const sessionRecord = getRecord(sessionDocument, "session");
    assert.equal(getArray(sessionRecord, "turns").length, 2);

    const consultRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      consultPayload.runId,
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
        consultSessionId,
        "What should we verify next?",
        "--json",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(followupResult.exitCode, 0, followupResult.stderr);
    const followupPayload = parseBatchPayload(followupResult.stdout);
    assert.equal(followupPayload.command, "followup");
    assert.equal(followupPayload.results.length, 1);
    const followupReview = followupPayload.results[0];
    assert.ok(followupReview);
    assert.equal(followupReview.sessionId, consultSessionId);
    assert.equal(followupReview.output.kind, "consultation");

    const followedSessionDocument = await readStoredRecord(
      sandbox.storageRoot,
      "sessions",
      consultSessionId,
    );
    assert.equal(
      getArray(getRecord(followedSessionDocument, "session"), "turns").length,
      4,
    );

    const debugResult = await runCli(
      process.execPath,
      [BUILT_CLI_PATH, "debug", "Why is the build red?", "--json"],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(debugResult.exitCode, 0, debugResult.stderr);
    const debugPayload = parseBatchPayload(debugResult.stdout);
    assert.equal(debugPayload.command, "debug");
    assert.equal(debugPayload.status, "completed");
    assert.equal(debugPayload.results.length, 1);
    const debugReview = debugPayload.results[0];
    assert.ok(debugReview);
    assert.equal(debugReview.provider, "claude-code");
    assert.equal(debugReview.output.kind, "debug");
    assert.equal(debugReview.output.details.length, 3);
    assert.match(
      debugReview.output.details[0] ?? "",
      /Analyze the most likely root cause/,
    );

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
    const comparisonReport = getFirstRecord(
      debugRunRecord,
      "comparisonReports",
    );
    assert.equal(
      getString(comparisonReport, "topic"),
      "Why is the build red? (claude-code)",
    );
    const debugRunContext = getFirstRecord(debugRunRecord, "runContexts");
    assert.equal(
      getString(debugRunContext, "question"),
      "Why is the build red?",
    );
    await access(getOptionalString(debugRunContext, "artifactPath") ?? "");

    const planResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "plan",
        "Review this implementation plan.",
        "--file",
        planPath,
        "--json",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(planResult.exitCode, 0, planResult.stderr);
    const planPayload = parsePlanBatchPayload(planResult.stdout);
    assert.equal(planPayload.command, "plan");
    assert.equal(planPayload.status, "completed");
    assert.equal(planPayload.results.length, 1);
    const planReview = planPayload.results[0];
    assert.ok(planReview);
    assert.equal(planReview.provider, "claude-code");
    assert.ok(planReview.sessionId);
    assert.equal(planReview.output.kind, "plan");
    assert.equal(planReview.output.details.length, 3);
    assert.equal(planReview.output.verdict, "good");
    assert.doesNotMatch(planReview.output.summary, /^\[advice\]/);
    assert.match(planReview.output.summary, /PLAN_VERDICT: good/);
    assert.match(
      planReview.output.details.join("\n\n"),
      /Plan reviewed: # Rollout Plan/,
    );

    const planRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      planPayload.runId,
    );
    const planRunRecord = getRecord(planRunDocument, "run");
    assert.equal(getString(planRunRecord, "mode"), "orchestrated");
    assert.deepEqual(
      getRecordArray(planRunRecord, "tasks").map((task) =>
        getString(task, "role"),
      ),
      ["analyzer", "critic", "advisor"],
    );
    const planRunContext = getFirstRecord(planRunRecord, "runContexts");
    assert.equal(
      getString(planRunContext, "question"),
      "Review this implementation plan.",
    );
    assert.equal(getString(planRunContext, "filePath"), planPath);
    await access(getOptionalString(planRunContext, "artifactPath") ?? "");
    await access(getOptionalString(planRunContext, "sourceArtifactPath") ?? "");

    const planSessionDocument = await readStoredRecord(
      sandbox.storageRoot,
      "sessions",
      planReview.sessionId,
    );
    const planSessionRecord = getRecord(planSessionDocument, "session");
    const planTurns = getRecordArray(planSessionRecord, "turns");
    const planUserTurn = planTurns[0];
    assert.ok(planUserTurn);
    assert.match(
      getString(planUserTurn, "content"),
      /Plan document:\n# Rollout Plan/,
    );
    assert.equal(getStringArray(planUserTurn, "artifactIds").length, 1);

    const planFollowupResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "followup",
        "--session",
        planReview.sessionId,
        "What should we validate first?",
        "--json",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(planFollowupResult.exitCode, 0, planFollowupResult.stderr);
    const planFollowupPayload = parseBatchPayload(planFollowupResult.stdout);
    const planFollowupReview = planFollowupPayload.results[0];
    assert.ok(planFollowupReview);
    assert.equal(planFollowupReview.output.kind, "consultation");
    assert.match(
      planFollowupReview.output.answer,
      /Transcript reviewed: # Rollout Plan/,
    );
  } finally {
    await sandbox.cleanup();
  }
});

test("CLI rejects --file outside the plan command", async () => {
  const sandbox = await createCliSandbox("aipanel-cli-invalid-file-");
  const planPath = path.join(sandbox.workspace, "not-for-consult.md");

  await writeFile(planPath, "# Wrong Command\n", "utf8");

  try {
    const result = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Should reject the file flag.",
        "--file",
        planPath,
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /`--file` is only supported by `plan`\./);
  } finally {
    await sandbox.cleanup();
  }
});

test("CLI supports codex consult, followup, and debug through exec flow", async () => {
  const sandbox = await createCliSandbox("aipanel-cli-codex-");
  const planPath = path.join(sandbox.workspace, "plan.md");

  await writeFile(
    path.join(sandbox.workspace, "note.txt"),
    "investigate the flaky reviewer flow\n",
    "utf8",
  );
  await writeFile(
    planPath,
    "# Codex Plan\n\n1. Inspect the current reviewer flow\n2. Patch the execution path\n",
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
    const consultPayload = parseBatchPayload(consultResult.stdout);
    const consultReview = consultPayload.results[0];
    assert.ok(consultReview);
    assert.equal(consultReview.provider, "codex");
    assert.equal(consultReview.output.kind, "consultation");
    assert.match(consultReview.output.answer, /Codex answer/);

    const consultSessionId = consultReview.sessionId ?? "";
    const sessionDocument = await readStoredRecord(
      sandbox.storageRoot,
      "sessions",
      consultSessionId,
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
        consultSessionId,
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
    const followupPayload = parseBatchPayload(followupResult.stdout);
    const followupReview = followupPayload.results[0];
    assert.ok(followupReview);
    assert.equal(followupReview.provider, "codex");
    assert.equal(followupReview.output.kind, "consultation");

    const debugResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Review the failure mode in one short paragraph.",
        "--json",
        "--provider",
        "codex",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(debugResult.exitCode, 0, debugResult.stderr);
    const debugPayload = parseBatchPayload(debugResult.stdout);
    const debugReview = debugPayload.results[0];
    assert.ok(debugReview);
    assert.equal(debugReview.provider, "codex");
    assert.equal(debugReview.output.kind, "debug");
    assert.equal(debugReview.output.details.length, 3);
    assert.match(
      debugReview.output.details[0] ?? "",
      /Analyze the most likely root cause/,
    );

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

    const planResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "plan",
        "Review the codex plan path.",
        "--json",
        "--provider",
        "codex",
        "--file",
        planPath,
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(planResult.exitCode, 0, planResult.stderr);
    const planPayload = parsePlanBatchPayload(planResult.stdout);
    const planReview = planPayload.results[0];
    assert.ok(planReview);
    assert.equal(planReview.provider, "codex");
    assert.equal(planReview.output.kind, "plan");
    assert.equal(planReview.output.verdict, "good");
    assert.match(
      planReview.output.details.join("\n\n"),
      /Plan reviewed: # Codex Plan/,
    );

    const planRunDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      planPayload.runId,
    );
    const planRunRecord = getRecord(planRunDocument, "run");
    assert.deepEqual(
      getRecordArray(planRunRecord, "providerResponses").map((response) =>
        getString(response, "provider"),
      ),
      ["codex", "codex", "codex"],
    );
    const planRunContext = getFirstRecord(planRunRecord, "runContexts");
    await access(getOptionalString(planRunContext, "sourceArtifactPath") ?? "");
  } finally {
    await sandbox.cleanup();
  }
});

test("CLI consult can fan out to claude and repeated codex reviewers", async () => {
  const sandbox = await createCliSandbox("aipanel-cli-multi-");

  try {
    const consultResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Compare the reviewers and keep it short.",
        "--json",
        "--provider",
        "claude-code",
        "--provider",
        "codex",
        "--provider",
        "codex",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(consultResult.exitCode, 0, consultResult.stderr);
    const consultPayload = parseBatchPayload(consultResult.stdout);
    assert.equal(consultPayload.command, "consult");
    assert.equal(consultPayload.status, "completed");
    assert.deepEqual(
      consultPayload.results.map((result) => result.provider),
      ["claude-code", "codex", "codex"],
    );

    const sessionIds = consultPayload.results.map(
      (result) => result.sessionId ?? "",
    );
    assert.equal(new Set(sessionIds).size, 3);

    const runDocument = await readStoredRecord(
      sandbox.storageRoot,
      "runs",
      consultPayload.runId,
    );
    const runRecord = getRecord(runDocument, "run");
    assert.equal(getString(runRecord, "mode"), "orchestrated");
    assert.deepEqual(
      getRecordArray(runRecord, "providerResponses").map((response) =>
        getString(response, "provider"),
      ),
      ["claude-code", "codex", "codex"],
    );
  } finally {
    await sandbox.cleanup();
  }
});

test("CLI routes provider:model overrides into the selected adapters", async () => {
  const sandbox = await createCliSandbox("aipanel-cli-model-");

  try {
    const consultResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Use the requested models and keep it short.",
        "--json",
        "--provider",
        "claude-code:claude-sonnet-4-5",
        "--provider",
        "codex:codex-reviewer",
      ],
      {
        cwd: REPO_ROOT,
        env: sandbox.env,
      },
    );
    assert.equal(consultResult.exitCode, 0, consultResult.stderr);
    const consultPayload = parseBatchPayload(consultResult.stdout);
    assert.deepEqual(
      consultPayload.results.map((result) => result.provider),
      ["claude-code", "codex"],
    );
    const claudeReview = consultPayload.results[0];
    const codexReview = consultPayload.results[1];
    assert.ok(claudeReview);
    assert.ok(codexReview);
    assert.equal(claudeReview.output.kind, "consultation");
    assert.equal(codexReview.output.kind, "consultation");
    assert.match(claudeReview.output.answer, /Model used: claude-sonnet-4-5/);
    assert.match(codexReview.output.answer, /Model used: codex-reviewer/);
  } finally {
    await sandbox.cleanup();
  }
});
