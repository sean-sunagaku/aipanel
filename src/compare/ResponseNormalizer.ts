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

/**
 * Lines を抽出する。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param text 処理対象のテキスト。
 * @returns 収集した string の一覧。
 */
function extractLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Summary を抽出する。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param lines 処理に渡す lines。
 * @returns 生成または整形した文字列。
 */
function extractSummary(lines: string[]): string {
  return lines.slice(0, 3).join(" ").trim();
}

/**
 * Findings を抽出する。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param lines 処理に渡す lines。
 * @returns 収集した string の一覧。
 */
function extractFindings(lines: string[]): string[] {
  const bulletLike = lines.filter((line) => /^([-*]|\d+\.)\s+/.test(line));
  if (bulletLike.length > 0) {
    return bulletLike
      .slice(0, 8)
      .map((line) => line.replace(/^([-*]|\d+\.)\s+/, "").trim());
  }

  return lines.slice(0, 5);
}

/**
 * Suggestions を抽出する。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param lines 処理に渡す lines。
 * @returns 収集した string の一覧。
 */
function extractSuggestions(lines: string[]): string[] {
  return lines
    .filter((line) => /suggest|recommend|consider|should/i.test(line))
    .slice(0, 5);
}

/**
 * Response Normalizer の責務を一箇所にまとめる。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 */
export class ResponseNormalizer {
  /**
   * 入力 を安定した内部表現へ正規化する。
   * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
   *
   * @param options この宣言に必要なオプション。
   * @returns NormalizedResponseLike。
   * @remarks 入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。
   */
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
