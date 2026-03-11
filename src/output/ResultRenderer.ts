import type { ConsultationResult } from "../usecases/ConsultUseCase.js";
import type { DebugResult } from "../usecases/DebugUseCase.js";

type RenderedOutput = {
  text: string;
  json: Record<string, unknown>;
};

type RenderableResult =
  | { kind: "providers"; providers: string[] }
  | ConsultationResult
  | DebugResult;

/**
 * Result を表示向けの形へ整える。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
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
    outputFormat: "text" | "json" = "text",
  ): RenderedOutput {
    const rendered = (() => {
      switch (result.kind) {
        case "providers":
          return {
            text: result.providers.join("\n"),
            json: {
              kind: result.kind,
              providers: result.providers,
            },
          };
        case "consultation":
          return {
            text: [
              `session: ${result.sessionId}`,
              `run: ${result.runId}`,
              `provider: ${result.provider}`,
              `model: ${result.model}`,
              `status: ${result.status}`,
              "",
              result.answer,
            ].join("\n"),
            json: { ...result },
          };
        case "debug":
          return {
            text: [
              `session: ${result.sessionId}`,
              `run: ${result.runId}`,
              `provider: ${result.provider}`,
              `model: ${result.model}`,
              `status: ${result.status}`,
              "",
              `summary: ${result.summary}`,
              "",
              result.details.join("\n\n"),
            ].join("\n"),
            json: { ...result },
          };
      }
    })();

    if (outputFormat === "json") {
      return {
        text: `${JSON.stringify(rendered.json, null, 2)}\n`,
        json: rendered.json,
      };
    }

    return rendered;
  }
}
