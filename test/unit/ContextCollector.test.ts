import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ContextCollector } from "../../src/context/ContextCollector.js";

test("ContextCollector resolves relative paths from collect cwd override", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "aipanel-context-"));

  try {
    await writeFile(path.join(workspace, "note.txt"), "hello from override cwd\n", "utf8");
    const collector = new ContextCollector({ cwd: "/" });

    const bundle = await collector.collect({
      cwd: workspace,
      question: "What is in the file?",
      files: ["note.txt"],
    });

    assert.equal(bundle.metadata.cwd, workspace);
    assert.equal(bundle.files.length, 1);
    assert.equal(bundle.files[0]?.absolutePath, path.join(workspace, "note.txt"));
    assert.match(bundle.files[0]?.content ?? "", /hello from override cwd/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
