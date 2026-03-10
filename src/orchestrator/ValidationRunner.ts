import type { NormalizedResponseData, ValidationResult } from "../shared/contracts.js";

export class ValidationRunner {
  validate(normalizedResponses: NormalizedResponseData[]): ValidationResult {
    if (normalizedResponses.length === 0) {
      return {
        status: "failed",
        notes: ["No normalized responses were produced."],
      };
    }

    const lowConfidence = normalizedResponses.filter(
      (response) => response.confidence.level === "low",
    );

    if (lowConfidence.length > 0) {
      return {
        status: "partial",
        notes: lowConfidence.map(
          (response) =>
            `Low confidence response from ${response.provider}/${response.taskId}: ${response.confidence.reason}`,
        ),
      };
    }

    return {
      status: "validated",
      notes: ["All task responses reached the minimum validation threshold for phase 1."],
    };
  }
}
