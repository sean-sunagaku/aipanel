/**
 * ResultRenderer を定義する。
 * このファイルは、use case 結果の text/json 表示差分を renderer に閉じ込め、command 側が出力文字列を都度組み立てないようにするために存在する。
 */

import type { ConsultationResult } from "../usecases/ConsultUseCase.js";
import type { DebugResult } from "../usecases/DebugUseCase.js";
import type { OutputFormat } from "../shared/commands.js";
import { match } from "ts-pattern";

type RenderedOutput = {
  text: string;
  json: Record<string, unknown>;
};

type RenderableResult =
  | { kind: "providers"; providers: string[] }
  | ConsultationResult
  | DebugResult;

/**
 * Result を表示整形役として定義する。
 * use case 結果の text/json 出力差分を renderer に集め、command 側で表示文字列の組み立てを重複させないようにする。
 */
export class ResultRenderer {
  /**
   * 内容 を表示向けの文字列へ変換する。
   * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
   *
   * @param result 処理に渡す result。
   * @param outputFormat 処理に渡す output Format。
   * @returns RenderedOutput。
   */
  render(
    result: RenderableResult,
    outputFormat: OutputFormat = "text",
  ): RenderedOutput {
    const rendered = match(result)
      .with({ kind: "providers" }, ({ providers }) => ({
        text: providers.join("\n"),
        json: { kind: "providers", providers },
      }))
      .with({ kind: "consultation" }, (r) => ({
        text: [
          `session: ${r.sessionId}`,
          `run: ${r.runId}`,
          `provider: ${r.provider}`,
          `model: ${r.model}`,
          `status: ${r.status}`,
          `review: ${r.reviewStatus}`,
          "",
          r.answer,
        ].join("\n"),
        json: { ...r },
      }))
      .with({ kind: "debug" }, (r) => ({
        text: [
          `session: ${r.sessionId}`,
          `run: ${r.runId}`,
          `provider: ${r.provider}`,
          `model: ${r.model}`,
          `status: ${r.status}`,
          "",
          `summary: ${r.summary}`,
          "",
          r.details.join("\n\n"),
        ].join("\n"),
        json: { ...r },
      }))
      .exhaustive();

    if (outputFormat === "json") {
      return {
        text: `${JSON.stringify(rendered.json, null, 2)}\n`,
        json: rendered.json,
      };
    }

    return rendered;
  }
}
