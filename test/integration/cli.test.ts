import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createFakeClaudeBinary } from "../support/fakeClaude.js";
import { createFakeCodexBinary } from "../support/fakeCodex.js";
import { BUILT_CLI_PATH, REPO_ROOT } from "../support/testPaths.js";
import { runCli } from "../support/runCli.js";

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

test("CLI providers, consult, followup, and debug flows work end-to-end", async () => {
  const sandboxRoot = await mkdtemp(path.join(os.tmpdir(), "aipanel-cli-"));
  const workspace = path.join(sandboxRoot, "workspace");
  const storageRoot = path.join(sandboxRoot, "storage");
  const fakeBin = path.join(sandboxRoot, "fake-bin");

  await mkdir(workspace, { recursive: true });
  await writeFile(
    path.join(workspace, "note.txt"),
    "cache invalidation notes\n",
    "utf8",
  );
  await writeFile(
    path.join(workspace, "change.diff"),
    "--- a\n+++ b\n@@\n-cache\n+fresh cache\n",
    "utf8",
  );
  await writeFile(
    path.join(workspace, "app.log"),
    "ERROR cache refresh skipped\n",
    "utf8",
  );
  await createFakeClaudeBinary(fakeBin);
  await createFakeCodexBinary(fakeBin);
  await mkdir(storageRoot, { recursive: true });
  await writeFile(
    path.join(storageRoot, "profile.yml"),
    "defaultModel: claude-sonnet-4-5\n",
    "utf8",
  );

  const env = {
    ...process.env,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
    AIPANEL_STORAGE_ROOT: storageRoot,
  };

  try {
    const providersResult = await runCli(
      process.execPath,
      [BUILT_CLI_PATH, "providers", "--json"],
      {
        cwd: REPO_ROOT,
        env,
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
        "--cwd",
        workspace,
        "--file",
        "note.txt",
        "--diff",
        "change.diff",
        "--log",
        "app.log",
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(consultResult.exitCode, 0, consultResult.stderr);
    const consultation = JSON.parse(
      consultResult.stdout,
    ) as ConsultationPayload;
    assert.equal(consultation.kind, "consultation");
    assert.equal(consultation.provider, "claude-code");
    assert.equal(consultation.model, "claude-sonnet-4-5");
    assert.equal(consultation.status, "completed");
    assert.match(consultation.answer, /Practical answer/);
    assert.match(consultation.answer, /Model used: claude-sonnet-4-5/);

    const sessionDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "sessions", `${consultation.sessionId}.json`),
        "utf8",
      ),
    ) as {
      session: {
        turns: Array<{ role: string }>;
        providerRefs: Array<{ providerSessionId: string }>;
      };
    };
    assert.equal(sessionDocument.session.turns.length, 2);
    assert.equal(
      sessionDocument.session.providerRefs[0]?.providerSessionId,
      "fake-claude-session",
    );

    const consultRunDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "runs", `${consultation.runId}.json`),
        "utf8",
      ),
    ) as {
      run: {
        mode: string;
        contextBundles: Array<{
          files: Array<{ path: string }>;
          metadata: { artifactId?: string; artifactPath?: string };
        }>;
        providerResponses: Array<{ provider: string; model: string }>;
      };
    };
    assert.equal(consultRunDocument.run.mode, "direct");
    assert.equal(
      consultRunDocument.run.contextBundles[0]?.files[0]?.path,
      "note.txt",
    );
    assert.equal(
      consultRunDocument.run.providerResponses[0]?.provider,
      "claude-code",
    );
    assert.equal(
      consultRunDocument.run.providerResponses[0]?.model,
      "claude-sonnet-4-5",
    );
    await access(
      consultRunDocument.run.contextBundles[0]?.metadata.artifactPath ?? "",
    );

    const followupResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "followup",
        "--session",
        consultation.sessionId,
        "What should we verify next?",
        "--json",
        "--cwd",
        workspace,
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(followupResult.exitCode, 0, followupResult.stderr);
    const followup = JSON.parse(followupResult.stdout) as ConsultationPayload;
    assert.equal(followup.sessionId, consultation.sessionId);
    assert.equal(followup.model, "claude-sonnet-4-5");

    const followedSessionDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "sessions", `${consultation.sessionId}.json`),
        "utf8",
      ),
    ) as {
      session: {
        turns: Array<{ role: string }>;
      };
    };
    assert.equal(followedSessionDocument.session.turns.length, 4);

    const debugResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Why is the build red?",
        "--json",
        "--cwd",
        workspace,
        "--file",
        "note.txt",
        "--log",
        "app.log",
        "--model",
        "claude-opus-4-1",
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(debugResult.exitCode, 0, debugResult.stderr);
    const debugPayload = JSON.parse(debugResult.stdout) as DebugPayload;
    assert.equal(debugPayload.kind, "debug");
    assert.equal(debugPayload.provider, "claude-code");
    assert.equal(debugPayload.model, "claude-opus-4-1");
    assert.equal(debugPayload.status, "completed");
    assert.equal(debugPayload.details.length, 3);
    assert.match(debugPayload.details[0] ?? "", /Model used: claude-opus-4-1/);

    const debugRunDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "runs", `${debugPayload.runId}.json`),
        "utf8",
      ),
    ) as {
      run: {
        mode: string;
        tasks: Array<{ role: string }>;
        providerResponses: Array<{ model: string }>;
        comparisonReports: Array<{ topic: string }>;
        contextBundles: Array<{ metadata: { artifactPath?: string } }>;
      };
    };
    assert.equal(debugRunDocument.run.mode, "orchestrated");
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
      "Why is the build red?",
    );
    await access(
      debugRunDocument.run.contextBundles[0]?.metadata.artifactPath ?? "",
    );
  } finally {
    await rm(sandboxRoot, { recursive: true, force: true });
  }
});

test("CLI supports codex consult, followup, and debug through exec flow", async () => {
  const sandboxRoot = await mkdtemp(
    path.join(os.tmpdir(), "aipanel-cli-codex-"),
  );
  const workspace = path.join(sandboxRoot, "workspace");
  const storageRoot = path.join(sandboxRoot, "storage");
  const fakeBin = path.join(sandboxRoot, "fake-bin");

  await mkdir(workspace, { recursive: true });
  await writeFile(
    path.join(workspace, "note.txt"),
    "investigate the flaky reviewer flow\n",
    "utf8",
  );
  await writeFile(
    path.join(workspace, "app.log"),
    "WARN retry budget almost exhausted\n",
    "utf8",
  );
  await createFakeClaudeBinary(fakeBin);
  await createFakeCodexBinary(fakeBin);
  await mkdir(storageRoot, { recursive: true });
  await writeFile(
    path.join(storageRoot, "profile.yml"),
    ["defaultProvider: codex", "defaultTimeoutMs: 120000"].join("\n"),
    "utf8",
  );

  const env = {
    ...process.env,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
    AIPANEL_STORAGE_ROOT: storageRoot,
  };

  try {
    const consultResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "consult",
        "Review the likely issue and next step.",
        "--json",
        "--cwd",
        workspace,
        "--file",
        "note.txt",
        "--log",
        "app.log",
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(consultResult.exitCode, 0, consultResult.stderr);
    const consultation = JSON.parse(
      consultResult.stdout,
    ) as ConsultationPayload;
    assert.equal(consultation.provider, "codex");
    assert.equal(consultation.model, "configured-default");
    assert.match(consultation.answer, /Codex answer/);
    assert.match(consultation.answer, /Model used: configured-default/);

    const sessionDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "sessions", `${consultation.sessionId}.json`),
        "utf8",
      ),
    ) as {
      session: {
        providerRefs: Array<{ providerSessionId: string }>;
        turns: Array<{ role: string }>;
      };
    };
    assert.equal(sessionDocument.session.turns.length, 2);
    assert.equal(
      sessionDocument.session.providerRefs[0]?.providerSessionId,
      "fake-codex-thread",
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
        "--cwd",
        workspace,
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(followupResult.exitCode, 0, followupResult.stderr);
    const followup = JSON.parse(followupResult.stdout) as ConsultationPayload;
    assert.equal(followup.provider, "codex");
    assert.equal(followup.model, "configured-default");

    const debugResult = await runCli(
      process.execPath,
      [
        BUILT_CLI_PATH,
        "debug",
        "Review the failure mode in one short paragraph.",
        "--json",
        "--cwd",
        workspace,
        "--file",
        "note.txt",
        "--log",
        "app.log",
        "--model",
        "codex-pro",
      ],
      {
        cwd: REPO_ROOT,
        env,
      },
    );
    assert.equal(debugResult.exitCode, 0, debugResult.stderr);
    const debugPayload = JSON.parse(debugResult.stdout) as DebugPayload;
    assert.equal(debugPayload.provider, "codex");
    assert.equal(debugPayload.model, "codex-pro");
    assert.equal(debugPayload.details.length, 3);
    assert.match(debugPayload.details[0] ?? "", /Model used: codex-pro/);

    const debugRunDocument = JSON.parse(
      await readFile(
        path.join(storageRoot, "runs", `${debugPayload.runId}.json`),
        "utf8",
      ),
    ) as {
      run: {
        providerResponses: Array<{ provider: string; model: string }>;
      };
    };
    assert.deepEqual(
      debugRunDocument.run.providerResponses.map(
        (response) => response.provider,
      ),
      ["codex", "codex", "codex"],
    );
    assert.deepEqual(
      debugRunDocument.run.providerResponses.map((response) => response.model),
      ["codex-pro", "codex-pro", "codex-pro"],
    );
  } finally {
    await rm(sandboxRoot, { recursive: true, force: true });
  }
});
