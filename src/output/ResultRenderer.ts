import type { ConsultationResult } from "../usecases/ConsultUseCase.js";
import type { DebugResult } from "../usecases/DebugUseCase.js";

export type RenderedOutput = {
  text: string;
  json: Record<string, unknown>;
};

export type RenderableResult =
  | { kind: "providers"; providers: string[] }
  | ConsultationResult
  | DebugResult;

export class ResultRenderer {
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
