import type { NormalizedResponseLike } from "./ResponseNormalizer.js";

interface ComparisonReportData {
  reportId: string | null;
  runId: string | null;
  topic: string;
  responseIds: string[];
  agreements: string[];
  differences: string[];
  recommendation: string | null;
}

export class ComparisonEngine {
  compare(
    topic: string,
    normalizedResponses: NormalizedResponseLike[],
  ): ComparisonReportData {
    const summaries = normalizedResponses
      .map((response) => response.summary)
      .filter(Boolean);

    const findings = normalizedResponses.flatMap(
      (response) => response.findings ?? [],
    );
    const uniqueFindings = [...new Set(findings)];

    return {
      reportId: null,
      runId: null,
      topic,
      responseIds: normalizedResponses.map(
        (response) => response.normalizedResponseId,
      ),
      agreements: summaries.length > 0 ? summaries : [],
      differences: normalizedResponses.length > 1 ? uniqueFindings : [],
      recommendation: summaries[0] ?? "No recommendation available.",
    };
  }
}
