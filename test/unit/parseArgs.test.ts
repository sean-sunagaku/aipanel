import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs } from "../../src/cli/parseArgs.js";

test("parseArgs defaults to help and uses text output by default", () => {
  const parsed = parseArgs([]);

  assert.equal(parsed.command, "help");
  assert.equal(parsed.outputFormat, "text");
  assert.deepEqual(parsed.positionals, []);
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
  ]);

  assert.equal(parsed.command, "consult");
  assert.equal(parsed.outputFormat, "json");
  assert.equal(parsed.positionals.join(" "), "Why is this happening?");
  assert.equal(parsed.providerName, "claude-code");
  assert.equal(parsed.model, "opus");
  assert.equal(parsed.sessionId, "sid-1");
  assert.equal(parsed.timeoutMs, 3000);
});

test("parseArgs marks unknown command as unknown", () => {
  const parsed = parseArgs(["unknown", "question"]);

  assert.equal(parsed.command, "unknown");
  assert.deepEqual(parsed.positionals, ["question"]);
});
