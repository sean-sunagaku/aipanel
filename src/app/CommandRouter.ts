import { AipanelApp } from "./AipanelApp.js";
import { parseArgs, type CliCommand, type ParsedCommand } from "../cli/parseArgs.js";

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

type RouterResult = { responseText: string; exitCode: number };
type RouteHandler = () => Promise<RouterResult>;

const usageText = [
  "Usage:",
  "  aipanel providers [--json]",
  "  aipanel consult <question> [--provider <name>] [--model <name>] [--file <path>] [--diff <path>] [--log <path>] [--json]",
  "  aipanel followup --session <id> <question> [--provider <name>] [--model <name>] [--json]",
  "  aipanel debug <question> [--provider <name>] [--model <name>] [--file <path>] [--diff <path>] [--log <path>] [--json]",
].join("\n");

const DEFAULT_TIMEOUT_MS = 120000;


/**
 * Command Router の責務を一箇所にまとめる。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
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
   * @throws 実行に必要な前提を満たせない場合。
   * @remarks 入力条件ごとの差分をここで吸収しているため、分岐を削るときは呼び出し側へ責務を漏らさないか確認する。
   */
  async route(argv: string[]): Promise<{ responseText: string; exitCode: number }> {
    const parsed = parseArgs(argv);
    const selectedAdapter = this.app.providerRegistry.get(parsed.providerName);
    const providerName = selectedAdapter.name;
    const model =
      parsed.model ?? selectedAdapter.defaultModel;
    const timeoutMs = parsed.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const knownRoutes = {
      help: (): Promise<RouterResult> => {
        return Promise.resolve({ responseText: usageText, exitCode: 0 });
      },
      providers: async (): Promise<RouterResult> => {
        const result = await this.app.listProvidersUseCase.execute();
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        return { responseText: rendered.text, exitCode: 0 };
      },
      consult: async (): Promise<RouterResult> => {
        const result = await this.app.consultUseCase.execute({
          command: "consult",
          question: requireQuestion(parsed.positionals),
          files: [...parsed.files],
          diffs: [...parsed.diffs],
          logs: [...parsed.logs],
          providerName,
          timeoutMs,
          cwd: parsed.cwd ?? process.cwd(),
          ...(model !== undefined ? { model } : {}),
          ...(parsed.sessionId ? { sessionId: parsed.sessionId } : {}),
        });
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        return {
          responseText: rendered.text,
          exitCode: result.status === "partial" ? 2 : 0,
        };
      },
      followup: async (): Promise<RouterResult> => {
        if (!parsed.sessionId) {
          throw new Error("`followup` requires --session <id>.");
        }

        const result = await this.app.followupUseCase.execute({
          question: requireQuestion(parsed.positionals),
          sessionId: parsed.sessionId,
          files: [...parsed.files],
          diffs: [...parsed.diffs],
          logs: [...parsed.logs],
          providerName,
          timeoutMs,
          cwd: parsed.cwd ?? process.cwd(),
          ...(model !== undefined ? { model } : {}),
        });
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        return {
          responseText: rendered.text,
          exitCode: result.status === "partial" ? 2 : 0,
        };
      },
      debug: async (): Promise<RouterResult> => {
        const result = await this.app.debugUseCase.execute({
          question: requireQuestion(parsed.positionals),
          files: [...parsed.files],
          diffs: [...parsed.diffs],
          logs: [...parsed.logs],
          providerName,
          timeoutMs,
          cwd: parsed.cwd ?? process.cwd(),
          ...(model !== undefined ? { model } : {}),
          ...(parsed.sessionId ? { sessionId: parsed.sessionId } : {}),
        });
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        return {
          responseText: rendered.text,
          exitCode: result.status === "partial" ? 2 : 0,
        };
      },
    } satisfies Record<CliCommand, RouteHandler>;

    const routes: Record<ParsedCommand, RouteHandler> = {
      unknown: (): Promise<RouterResult> => {
        return Promise.resolve({ responseText: usageText, exitCode: 1 });
      },
      ...knownRoutes,
    };

    return routes[parsed.command]();
  }
}
