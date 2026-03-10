import type {
  ComparisonReportData,
  NormalizedResponseData,
  RunData,
} from "../shared/contracts.js";
import type { ComparisonEngine } from "../compare/ComparisonEngine.js";

export class ResultMerger {
  readonly #comparisonEngine: ComparisonEngine;

  constructor(comparisonEngine: ComparisonEngine) {
    this.#comparisonEngine = comparisonEngine;
  }

  merge(
    topic: string,
    run: RunData,
    normalizedResponses: NormalizedResponseData[],
  ): {
    finalSummary: string;
    comparisonReport: ComparisonReportData;
  } {
    const comparisonReport = this.#comparisonEngine.compare(
      topic,
      normalizedResponses,
    );
    comparisonReport.runId = run.runId;

    const parts = normalizedResponses.map((response) => {
      const findings = response.findings.slice(0, 3).join("; ");
      return `[${response.provider}/${response.taskId}] ${response.summary}${findings ? ` Findings: ${findings}` : ""}`;
    });

    return {
      finalSummary: parts.join("\n"),
      comparisonReport,
    };
  }
}
