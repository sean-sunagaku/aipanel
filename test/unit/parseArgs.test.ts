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
  assert.equal(parsed.filePath, undefined);
  assert.deepEqual(parsed.providers, [
    { name: "claude-code", model: "claude-sonnet-4-5" },
    { name: "codex", model: "codex-reviewer" },
  ]);
  assert.equal(parsed.sessionId, "sid-1");
  assert.equal(parsed.timeoutMs, 3000);
});

test("parseArgs parses plan with an optional file path", () => {
  const parsed = parseArgs([
    "plan",
    "Review",
    "this",
    "plan",
    "--file",
    "./docs/plan.md",
    "--provider",
    "codex",
  ]);

  assert.equal(parsed.command, "plan");
  assert.equal(parsed.positionals.join(" "), "Review this plan");
  assert.equal(parsed.filePath, "./docs/plan.md");
  assert.deepEqual(parsed.providers, [{ name: "codex" }]);
});

test("parseArgs parses plan without a file path", () => {
  const parsed = parseArgs(["plan", "Review", "this", "migration"]);

  assert.equal(parsed.command, "plan");
  assert.equal(parsed.positionals.join(" "), "Review this migration");
  assert.equal(parsed.filePath, undefined);
  assert.deepEqual(parsed.providers, []);
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
