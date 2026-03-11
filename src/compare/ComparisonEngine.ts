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

/**
 * Comparison Engine の責務を一箇所にまとめる。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 */
export class ComparisonEngine {
  /**
   * 対象 を比較して差分を整理する。
   * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
   *
   * @param topic 処理に渡す topic。
   * @param normalizedResponses 処理に渡す normalized Responses。
   * @returns ComparisonReportData。
   * @remarks 入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。
   */
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
