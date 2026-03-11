/**
 * ResultRenderer を定義する。
 * このファイルは、use case 結果の text/json 表示差分を renderer に閉じ込め、command 側が出力文字列を都度組み立てないようにするために存在する。
 */

import { match } from "ts-pattern";
import type { OutputFormat } from "../shared/commands.js";
import type {
  BatchPayload,
  BatchResult,
  BatchResultOutput,
  CliJsonPayload,
} from "../shared/cli-contract.js";

type RenderedOutput = {
  text: string;
  json: CliJsonPayload;
};

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
    result: CliJsonPayload,
    outputFormat: OutputFormat = "text",
  ): RenderedOutput {
    const rendered = match(result)
      .returnType<RenderedOutput>()
      .with({ kind: "providers" }, (payload) => ({
        text: payload.providers.join("\n"),
        json: payload,
      }))
      .with({ kind: "batch" }, (payload) => ({
        text: this.#renderBatchText(payload),
        json: payload,
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

  #renderBatchText(payload: BatchPayload): string {
    const sections = [
      `run: ${payload.runId}`,
      `command: ${payload.command}`,
      `status: ${payload.status}`,
      ...(payload.reviewStatus !== undefined
        ? [`review: ${payload.reviewStatus}`]
        : []),
      "",
      ...payload.results.flatMap((result, index) =>
        this.#renderBatchResult(result, index),
      ),
    ];

    return sections.join("\n");
  }

  #renderBatchResult(
    result: BatchResult,
    index: number,
  ): readonly string[] {
    const outputLines = match(result.output)
      .returnType<readonly string[]>()
      .with(
        { kind: "consultation" },
        ({ answer }: Extract<BatchResultOutput, { kind: "consultation" }>) =>
          answer.length > 0 ? [answer] : [],
      )
      .with(
        { kind: "debug" },
        ({ summary, details }: Extract<BatchResultOutput, { kind: "debug" }>) =>
          [
            `summary: ${summary}`,
            ...(details.length > 0 ? ["", details.join("\n\n")] : []),
          ],
      )
      .exhaustive();

    return [
      `[${index + 1}] provider: ${result.provider}`,
      ...(result.sessionId !== undefined
        ? [`session: ${result.sessionId}`]
        : []),
      `status: ${result.status}`,
      ...(result.reviewStatus !== undefined
        ? [`review: ${result.reviewStatus}`]
        : []),
      ...(result.errorMessage !== undefined
        ? [`error: ${result.errorMessage}`]
        : []),
      ...(outputLines.length > 0 ? ["", ...outputLines] : []),
      "",
    ];
  }
}
