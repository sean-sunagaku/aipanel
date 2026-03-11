/**
 * ComparisonEngine を定義する。
 * このファイルは、複数 provider の normalized response を比較結果へ落とし込み、debug の recommendation 生成責務を use case から分離するために存在する。
 */

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
 * Comparison の中核ロジックを定義する。
 * provider 応答の要約・差分化を compare 層へ閉じ込め、run/usecase が raw text 比較を直接抱え込まないようにする。
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
