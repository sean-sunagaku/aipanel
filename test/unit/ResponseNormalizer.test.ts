import assert from "node:assert/strict";
import test from "node:test";

import { ResponseNormalizer } from "../../src/compare/ResponseNormalizer.js";

test("ResponseNormalizer extracts summary, findings, suggestions, and keeps citations", () => {
  const normalizer = new ResponseNormalizer();

  const normalized = normalizer.normalize({
    taskId: "task_1",
    providerResponse: {
      provider: "claude-code",
      rawText: [
        "Root cause points to stale cache invalidation.",
        "- first finding",
        "- second finding",
        "Consider adding a regression test around cache refresh.",
      ].join("\n"),
      citations: [
        {
          kind: "file",
          pathOrUrl: "src/cache.ts",
          line: 42,
        },
      ],
      isError: false,
    },
  });

  assert.equal(normalized.provider, "claude-code");
  assert.match(normalized.summary, /stale cache invalidation/);
  assert.deepEqual(normalized.findings, ["first finding", "second finding"]);
  assert.deepEqual(normalized.suggestions, [
    "Consider adding a regression test around cache refresh.",
  ]);
  assert.deepEqual(normalized.citations, [
    {
      kind: "file",
      pathOrUrl: "src/cache.ts",
      line: 42,
    },
  ]);
  assert.deepEqual(normalized.confidence, {
    level: "medium",
    reason: "Derived from provider text output.",
  });
});
