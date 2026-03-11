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
