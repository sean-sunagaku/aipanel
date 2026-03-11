/**
 * CommandRouter と CLI usage 定義をまとめる。
 * このファイルは、CLI command ごとの分岐と exit code / rendering を app 層へ集め、entrypoint が個別 use case の詳細を持たないようにするために存在する。
 */

import { readFile } from "node:fs/promises";
import { match } from "ts-pattern";
import { AipanelApp } from "./AipanelApp.js";
import { parseArgs } from "../cli/parseArgs.js";
import type { RunResultStatus } from "../domain/run.js";
import type { ProviderSpec } from "../shared/commands.js";

/**
 * Question を必須として検証する。
 * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
 *
 * @param positionals 処理に渡す positionals。
 * @returns 生成または整形した文字列。
 * @throws 入力や参照先が前提を満たさない場合。
 * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
 */
function requireQuestion(positionals: readonly string[]): string {
  const question = positionals.join(" ").trim();
  if (!question) {
    throw new Error("Question is required.");
  }

  return question;
}
const usageText = [
  "Usage:",
  "  aipanel providers [--json]",
  "  aipanel consult <question> [--provider <provider[:model]>]... [--timeout <ms>] [--json]",
  "  aipanel followup --session <id> <question> [--provider <provider[:model]>] [--timeout <ms>] [--json]",
  "  aipanel debug <question> [--provider <provider[:model]>]... [--timeout <ms>] [--json]",
  "  aipanel plan <question> [--file <path>] [--provider <provider[:model]>]... [--timeout <ms>] [--json]",
  "",
  "Notes:",
  "  --session is only for `followup`.",
  "  --file is only for `plan` and attaches a source document to the prompt and run ledger.",
  "  Repeat `--provider` to run multiple reviewers, including the same provider more than once.",
  "  Add `:model` inside `--provider` to override a provider's model without restoring public `--model`.",
  "  `consult`, `debug`, and `plan` always start from the current question.",
].join("\n");

const DEFAULT_TIMEOUT_MS = 120000;

/**
 * Command の振り分け役を定義する。
 * CLI entrypoint と use case・provider・renderer の接続責務を app 層へ集め、個々の command 実装が composition details を持たないようにする。
 */
export class CommandRouter {
  readonly app: AipanelApp;

  constructor(app: AipanelApp) {
    this.app = app;
  }

  /**
   * 入力 に応じて処理先を振り分ける。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param argv 処理に渡す argv。
   * @returns { responseText: string; exitCode: number } を解決する Promise。
   */
  async route(
    argv: string[],
  ): Promise<{ responseText: string; exitCode: number }> {
    const parsed = parseArgs(argv);
    if (parsed.filePath !== undefined && parsed.command !== "plan") {
      throw new Error("`--file` is only supported by `plan`.");
    }
    const providers = this.#resolveProviders(parsed.providers);

    const timeoutMs = parsed.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const toExitCode = (status: RunResultStatus): number =>
      match(status)
        .with("completed", () => 0)
        .with("partial", () => 2)
        .exhaustive();

    return match(parsed.command)
      .with("help", () =>
        Promise.resolve({ responseText: usageText, exitCode: 0 }),
      )
      .with("providers", async () => {
        const result = await this.app.listProvidersUseCase.execute();
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        return { responseText: rendered.text, exitCode: 0 };
      })
      .with("consult", async () => {
        const result = await this.app.consultUseCase.execute({
          command: "consult",
          question: requireQuestion(parsed.positionals),
          providers,
          timeoutMs,
          cwd: process.cwd(),
        });
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        return {
          responseText: rendered.text,
          exitCode: toExitCode(result.status),
        };
      })
      .with("followup", async () => {
        if (!parsed.sessionId) {
          throw new Error("`followup` requires --session <id>.");
        }
        if (providers.length > 1) {
          throw new Error("`followup` supports at most one `--provider`.");
        }

        const result = await this.app.followupUseCase.execute({
          question: requireQuestion(parsed.positionals),
          sessionId: parsed.sessionId,
          providers,
          timeoutMs,
          cwd: process.cwd(),
        });
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        return {
          responseText: rendered.text,
          exitCode: toExitCode(result.status),
        };
      })
      .with("debug", async () => {
        const result = await this.app.debugUseCase.execute({
          question: requireQuestion(parsed.positionals),
          providers,
          timeoutMs,
          cwd: process.cwd(),
        });
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        return {
          responseText: rendered.text,
          exitCode: toExitCode(result.status),
        };
      })
      .with("plan", async () => {
        const question = requireQuestion(parsed.positionals);
        const fileContent =
          parsed.filePath !== undefined
            ? await readFile(parsed.filePath, "utf8")
            : undefined;
        const result = await this.app.planUseCase.execute({
          question,
          ...(fileContent !== undefined ? { fileContent } : {}),
          ...(parsed.filePath !== undefined ? { filePath: parsed.filePath } : {}),
          providers,
          timeoutMs,
          cwd: process.cwd(),
        });
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        const hasRevise = result.results.some(
          (providerResult) =>
            providerResult.output.kind === "plan" &&
            providerResult.output.verdict === "revise",
        );
        const baseExitCode = toExitCode(result.status);
        return {
          responseText: rendered.text,
          exitCode: hasRevise ? 2 : baseExitCode,
        };
      })
      .with("unknown", () =>
        Promise.resolve({ responseText: usageText, exitCode: 1 }),
      )
      .exhaustive();
  }

  /**
   * reviewer 指定の既定値を補完する。
   * provider 指定が無い command でも既定 provider で実行できるようにし、router 以外へ default 解決責務を漏らさない。
   *
   * @param providers 処理に渡す provider 指定。
   * @returns 解決済み provider 指定一覧。
   */
  #resolveProviders(
    providers: readonly ProviderSpec[],
  ): readonly ProviderSpec[] {
    if (providers.length > 0) {
      return providers;
    }

    return Object.freeze([{ name: this.app.providerRegistry.get().name }]);
  }
}
