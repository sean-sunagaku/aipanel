import assert from "node:assert/strict";
import test from "node:test";

import { ContextCollector } from "../../src/context/ContextCollector.js";

test("ContextCollector keeps only minimal prompt execution metadata", async () => {
  const collector = new ContextCollector({ cwd: "/default-workspace" });

  const bundle = await collector.collect({
    cwd: "/tmp/aipanel-workspace",
    question: "What should we do next?",
  });

  assert.equal(
    bundle.summary,
    "Prompt-only execution without external context attachments.",
  );
  assert.equal(bundle.cwd, "/tmp/aipanel-workspace");
  assert.equal(bundle.question, "What should we do next?");
  assert.ok(bundle.collectedAt.length > 0);
});

test("ContextCollector records an attached file path for plan document runs", async () => {
  const collector = new ContextCollector({ cwd: "/default-workspace" });

  const bundle = await collector.collect({
    cwd: "/tmp/aipanel-workspace",
    question: "Review this plan",
    filePath: "/tmp/aipanel-workspace/plan.markdown",
  });

  assert.equal(
    bundle.summary,
    "Prompt execution with an attached plan document.",
  );
  assert.equal(bundle.filePath, "/tmp/aipanel-workspace/plan.markdown");
});
