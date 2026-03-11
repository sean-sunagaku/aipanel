interface ProviderResponseLike {
  normalizedResponseId?: string;
  provider: string;
  rawText?: string;
  citations?: Array<{
    kind: string;
    label?: string | null;
    pathOrUrl?: string | null;
    line?: number | null;
  }>;
  isError?: boolean;
}

export interface NormalizedResponseLike {
  normalizedResponseId: string;
  taskId: string;
  provider: string;
  summary: string;
  findings: string[];
  suggestions: string[];
  citations: Array<{
    kind: string;
    label?: string | null;
    pathOrUrl?: string | null;
    line?: number | null;
  }>;
  confidence: {
    level: "low" | "medium" | "high";
    reason?: string | null;
  };
}

function extractLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractSummary(lines: string[]): string {
  return lines.slice(0, 3).join(" ").trim();
}

function extractFindings(lines: string[]): string[] {
  const bulletLike = lines.filter((line) => /^([-*]|\d+\.)\s+/.test(line));
  if (bulletLike.length > 0) {
    return bulletLike
      .slice(0, 8)
      .map((line) => line.replace(/^([-*]|\d+\.)\s+/, "").trim());
  }

  return lines.slice(0, 5);
}

function extractSuggestions(lines: string[]): string[] {
  return lines
    .filter((line) => /suggest|recommend|consider|should/i.test(line))
    .slice(0, 5);
}

export class ResponseNormalizer {
  normalize({
    taskId,
    providerResponse,
  }: {
    taskId: string;
    providerResponse: ProviderResponseLike;
  }): NormalizedResponseLike {
    const text = providerResponse.rawText ?? "";
    const lines = extractLines(text);

    return {
      normalizedResponseId:
        providerResponse.normalizedResponseId ?? `${taskId}_normalized`,
      taskId,
      provider: providerResponse.provider,
      summary: extractSummary(lines),
      findings: extractFindings(lines),
      suggestions: extractSuggestions(lines),
      citations: providerResponse.citations ?? [],
      confidence: {
        level: providerResponse.isError ? "low" : "medium",
        reason: providerResponse.isError
          ? "Provider response was marked as error."
          : "Derived from provider text output.",
      },
    };
  }
}
