import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs } from "../../src/cli/parseArgs.js";

test("parseArgs defaults to help and uses text output by default", () => {
  const parsed = parseArgs([]);

  assert.equal(parsed.command, "help");
  assert.equal(parsed.outputFormat, "text");
  assert.deepEqual(parsed.positionals, []);
  assert.equal(parsed.files.length, 0);
  assert.equal(parsed.diffs.length, 0);
  assert.equal(parsed.logs.length, 0);
});

test("parseArgs parses command and flags into an immutable object", () => {
  const parsed = parseArgs([
    "consult",
    "Why",
    "is",
    "this",
    "happening?",
    "--json",
    "--provider",
    "claude-code",
    "--model",
    "opus",
    "--session",
    "sid-1",
    "--timeout",
    "3000",
    "--cwd",
    "/tmp/work",
    "--file",
    "a.txt",
    "--diff",
    "b.patch",
    "--log",
    "c.log",
  ]);

  assert.equal(parsed.command, "consult");
  assert.equal(parsed.outputFormat, "json");
  assert.equal(parsed.positionals.join(" "), "Why is this happening?");
  assert.equal(parsed.providerName, "claude-code");
  assert.equal(parsed.model, "opus");
  assert.equal(parsed.sessionId, "sid-1");
  assert.equal(parsed.timeoutMs, 3000);
  assert.equal(parsed.cwd, "/tmp/work");
  assert.deepEqual(parsed.files, ["a.txt"]);
  assert.deepEqual(parsed.diffs, ["b.patch"]);
  assert.deepEqual(parsed.logs, ["c.log"]);
});

test("parseArgs marks unknown command as unknown", () => {
  const parsed = parseArgs(["unknown", "question"]);

  assert.equal(parsed.command, "unknown");
  assert.deepEqual(parsed.positionals, ["question"]);
});

