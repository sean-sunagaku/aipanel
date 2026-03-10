import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createFakeClaudeBinary } from "../support/fakeClaude.js";
import { BUILT_CLI_PATH, REPO_ROOT } from "../support/testPaths.js";
import { runCli } from "../support/runCli.js";

interface ProvidersPayload {
  kind: "providers";
  providers: string[];
}

interface ConsultationPayload {
  kind: "consultation";
  sessionId: string;
  runId: string;
  answer: string;
  provider: string;
  model: string;
  status: "completed" | "partial";
  validationStatus: string;
}

interface DebugPayload {
  kind: "debug";
  sessionId: string;
  runId: string;
  provider: string;
  model: string;
  summary: string;
  details: string[];
  status: "completed" | "partial";
}

test("E2E: built CLI can complete providers, consult, followup, and debug with persistent storage", async () => {
  const sandboxRoot = await mkdtemp(path.join(os.tmpdir(), "aipanel-e2e-"));
  const workspace = path.join(sandboxRoot, "workspace");
  const storageRoot = path.join(sandboxRoot, "storage");
  const fakeBin = path.join(sandboxRoot, "fake-bin");

  await mkdir(workspace, { recursive: true });
  await writeFile(
    path.join(workspace, "context.md"),
    "# Context\n\nSomething is failing.\n",
    "utf8",
  );
  await writeFile(
    path.join(workspace, "error.log"),
    "ERROR dependency graph is stale\n",
    "utf8",
  );
  await createFakeClaudeBinary(fakeBin);

  const env = {
    ...process.env,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
    AIPANEL_STORAGE_ROOT: storageRoot,
  };

  try {
    const providers = await runCli(
      process.execPath,
      [BUILT_CLI_PATH, "providers", "--json"],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(providers.exitCode, 0, providers.stderr);
    const providersPayload = JSON.parse(providers.stdout) as ProvidersPayload;
    assert.deepEqual(providersPayload.providers, ["claude-code"]);

    const consult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Give a concise next step.",
        "--json",
        "--cwd",
        workspace,
        "--file",
        "context.md",
        "--log",
        "error.log",
        "--model",
        "claude-sonnet-4-5",
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(consult.exitCode, 0, consult.stderr);
    const consultPayload = JSON.parse(consult.stdout) as ConsultationPayload;
    assert.equal(consultPayload.status, "completed");
    assert.equal(consultPayload.provider, "claude-code");
    assert.equal(consultPayload.model, "claude-sonnet-4-5");

    const followup = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "followup",
        "--session",
        consultPayload.sessionId,
        "Now answer with one more short step.",
        "--json",
        "--cwd",
        workspace,
        "--model",
        "claude-sonnet-4-5",
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(followup.exitCode, 0, followup.stderr);
    const followupPayload = JSON.parse(followup.stdout) as ConsultationPayload;
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
        "--cwd",
        workspace,
        "--file",
        "context.md",
        "--log",
        "error.log",
        "--model",
        "claude-opus-4-1",
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(debug.exitCode, 0, debug.stderr);
    const debugPayload = JSON.parse(debug.stdout) as DebugPayload;
    assert.equal(debugPayload.status, "completed");
    assert.equal(debugPayload.provider, "claude-code");
    assert.equal(debugPayload.model, "claude-opus-4-1");
    assert.equal(debugPayload.details.length, 3);

    const sessionDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "sessions", `${consultPayload.sessionId}.json`),
        "utf8",
      ),
    ) as {
      session: {
        turns: Array<{ role: string }>;
      };
    };
    assert.equal(sessionDocument.session.turns.length, 4);

    const debugRunDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "runs", `${debugPayload.runId}.json`),
        "utf8",
      ),
    ) as {
      run: {
        tasks: Array<{ role: string }>;
        providerResponses: Array<{ model: string }>;
        comparisonReports: Array<{ topic: string }>;
      };
    };
    assert.deepEqual(
      debugRunDocument.run.tasks.map((task) => task.role),
      ["planner", "reviewer", "validator"],
    );
    assert.deepEqual(
      debugRunDocument.run.providerResponses.map((response) => response.model),
      ["claude-opus-4-1", "claude-opus-4-1", "claude-opus-4-1"],
    );
    assert.equal(
      debugRunDocument.run.comparisonReports[0]?.topic,
      "Diagnose the likely issue in one short paragraph.",
    );
  } finally {
    await rm(sandboxRoot, { recursive: true, force: true });
  }
});

test("E2E: built CLI honors profile defaultModel and explicit --model override", async () => {
  const sandboxRoot = await mkdtemp(
    path.join(os.tmpdir(), "aipanel-e2e-model-"),
  );
  const workspace = path.join(sandboxRoot, "workspace");
  const storageRoot = path.join(sandboxRoot, "storage");
  const fakeBin = path.join(sandboxRoot, "fake-bin");

  await mkdir(workspace, { recursive: true });
  await mkdir(storageRoot, { recursive: true });
  await writeFile(
    path.join(workspace, "context.md"),
    "# Context\n\nModel routing check.\n",
    "utf8",
  );
  await writeFile(
    path.join(storageRoot, "profile.yml"),
    [
      "defaultProvider: claude-code",
      "defaultModel: claude-sonnet-4-5",
      "defaultTimeoutMs: 120000",
    ].join("\n"),
    "utf8",
  );
  await createFakeClaudeBinary(fakeBin);

  const env = {
    ...process.env,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
    AIPANEL_STORAGE_ROOT: storageRoot,
  };

  try {
    const consult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Use the profile default model.",
        "--json",
        "--cwd",
        workspace,
        "--file",
        "context.md",
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(consult.exitCode, 0, consult.stderr);
    const consultPayload = JSON.parse(consult.stdout) as ConsultationPayload;
    assert.equal(consultPayload.model, "claude-sonnet-4-5");
    assert.match(consultPayload.answer, /Model used: claude-sonnet-4-5/);

    const consultRunDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "runs", `${consultPayload.runId}.json`),
        "utf8",
      ),
    ) as {
      run: {
        providerResponses: Array<{ model: string }>;
      };
    };
    assert.deepEqual(
      consultRunDocument.run.providerResponses.map(
        (response) => response.model,
      ),
      ["claude-sonnet-4-5"],
    );

    const debug = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Override the profile model for debug.",
        "--json",
        "--cwd",
        workspace,
        "--file",
        "context.md",
        "--model",
        "claude-opus-4-1",
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(debug.exitCode, 0, debug.stderr);
    const debugPayload = JSON.parse(debug.stdout) as DebugPayload;
    assert.equal(debugPayload.model, "claude-opus-4-1");
    assert.match(debugPayload.details[0] ?? "", /Model used: claude-opus-4-1/);

    const debugRunDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "runs", `${debugPayload.runId}.json`),
        "utf8",
      ),
    ) as {
      run: {
        providerResponses: Array<{ model: string }>;
      };
    };
    assert.deepEqual(
      debugRunDocument.run.providerResponses.map((response) => response.model),
      ["claude-opus-4-1", "claude-opus-4-1", "claude-opus-4-1"],
    );
  } finally {
    await rm(sandboxRoot, { recursive: true, force: true });
  }
});
