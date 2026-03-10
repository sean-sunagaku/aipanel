import type { ContextBundleData, PlanTaskSpec } from "../shared/contracts.js";

export class PlanBuilder {
  buildDirectPlan(
    question: string,
    contextBundle: ContextBundleData,
    provider: string,
  ): PlanTaskSpec[] {
    return [
      {
        taskKind: "consultation",
        role: "provider-reviewer",
        provider,
        prompt: this.#buildPrompt("Consultation", question, contextBundle),
      },
    ];
  }

  buildDebugPlan(
    question: string,
    contextBundle: ContextBundleData,
    provider: string,
  ): PlanTaskSpec[] {
    return [
      {
        taskKind: "root-cause-analysis",
        role: "planner",
        provider,
        prompt: this.#buildPrompt(
          "Root Cause Analysis",
          `Find the most likely root causes for the following problem.\n\n${question}`,
          contextBundle,
        ),
      },
      {
        taskKind: "risk-review",
        role: "provider-reviewer",
        provider,
        prompt: this.#buildPrompt(
          "Risk Review",
          `Review the implementation and identify likely regressions, edge cases, and hidden risks.\n\n${question}`,
          contextBundle,
        ),
      },
      {
        taskKind: "fix-proposal",
        role: "provider-reviewer",
        provider,
        prompt: this.#buildPrompt(
          "Fix Proposal",
          `Propose a pragmatic fix plan with the smallest safe change set.\n\n${question}`,
          contextBundle,
        ),
      },
    ];
  }

  #buildPrompt(
    label: string,
    question: string,
    contextBundle: ContextBundleData,
  ): string {
    const sections = [
      `Task: ${label}`,
      `Question:\n${question.trim()}`,
      `Context Summary:\n${contextBundle.summary}`,
    ];

    if ((contextBundle.files?.length ?? 0) > 0) {
      sections.push(
        contextBundle.files
          .map((file) => `File: ${file.path}\n${file.content ?? ""}`.trim())
          .join("\n\n"),
      );
    }

    if ((contextBundle.diffs?.length ?? 0) > 0) {
      sections.push(
        contextBundle.diffs
          .map((diff) => `Diff: ${diff.path}\n${diff.content ?? ""}`.trim())
          .join("\n\n"),
      );
    }

    if ((contextBundle.logs?.length ?? 0) > 0) {
      sections.push(
        contextBundle.logs
          .map((log) => `Log: ${log.path}\n${log.content ?? ""}`.trim())
          .join("\n\n"),
      );
    }

    sections.push(
      "Return a concise answer with findings, reasoning, and a short actionable recommendation.",
    );

    return sections.join("\n\n");
  }
}
