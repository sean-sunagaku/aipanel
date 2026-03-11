import assert from "node:assert/strict";
import test from "node:test";

import { ResultRenderer } from "../../src/output/ResultRenderer.js";

test("ResultRenderer renders plan verdicts and advisor summaries in text output", () => {
  const renderer = new ResultRenderer();

  const rendered = renderer.render({
    kind: "batch",
    command: "plan",
    runId: "run_plan_1",
    status: "completed",
    reviewStatus: "needs-review",
    results: [
      {
        provider: "claude-code",
        sessionId: "session_1",
        status: "completed",
        reviewStatus: "needs-review",
        output: {
          kind: "plan",
          summary: "Advisor final recommendation\nPLAN_VERDICT: revise",
          details: [
            "[analysis] assumptions",
            "[critique] rollout gap",
            "[advice] Advisor final recommendation\nPLAN_VERDICT: revise",
          ],
          verdict: "revise",
        },
      },
    ],
  });

  assert.match(rendered.text, /command: plan/);
  assert.match(rendered.text, /review: needs-review/);
  assert.match(rendered.text, /summary: Advisor final recommendation/);
  assert.match(rendered.text, /verdict: revise/);
  assert.doesNotMatch(rendered.text, /summary: \[advice\]/);
});
