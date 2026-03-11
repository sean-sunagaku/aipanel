import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs } from "../../src/cli/parseArgs.js";

test("parseArgs defaults to help and uses text output by default", () => {
  const parsed = parseArgs([]);

  assert.equal(parsed.command, "help");
  assert.equal(parsed.outputFormat, "text");
  assert.deepEqual(parsed.positionals, []);
});

test("parseArgs parses repeatable providers and common flags into an immutable object", () => {
  const parsed = parseArgs([
    "consult",
    "Why",
    "is",
    "this",
    "happening?",
    "--json",
    "--provider",
    "claude-code:claude-sonnet-4-5",
    "--provider",
    "codex:codex-reviewer",
    "--session",
    "sid-1",
    "--timeout",
    "3000",
  ]);

  assert.equal(parsed.command, "consult");
  assert.equal(parsed.outputFormat, "json");
  assert.equal(parsed.positionals.join(" "), "Why is this happening?");
  assert.deepEqual(parsed.providers, [
    { name: "claude-code", model: "claude-sonnet-4-5" },
    { name: "codex", model: "codex-reviewer" },
  ]);
  assert.equal(parsed.sessionId, "sid-1");
  assert.equal(parsed.timeoutMs, 3000);
});

test("parseArgs rejects unknown flags", () => {
  assert.throws(
    () => parseArgs(["consult", "Why", "--bogus"]),
    /Unknown option/,
  );
  assert.throws(
    () => parseArgs(["consult", "Why", "--another-bogus"]),
    /Unknown option/,
  );
  assert.throws(
    () => parseArgs(["consult", "Why", "--provider", "unknown-provider"]),
    /Unknown provider/,
  );
  assert.throws(
    () => parseArgs(["consult", "Why", "--provider", "codex:"]),
    /Invalid provider spec/,
  );
});

test("parseArgs marks unknown command as unknown", () => {
  const parsed = parseArgs(["unknown", "question"]);

  assert.equal(parsed.command, "unknown");
  assert.deepEqual(parsed.positionals, ["question"]);
});
