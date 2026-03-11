import { AipanelApp } from "./AipanelApp.js";

interface ParsedArgs {
  command: string;
  positionals: string[];
  outputFormat: "text" | "json";
  sessionId?: string;
  providerName?: string;
  model?: string;
  timeoutMs?: number;
  cwd?: string;
  files: string[];
  diffs: string[];
  logs: string[];
}

/**
 * Flag Value を読み取る。
 * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
 *
 * @param args 処理に渡す args。
 * @param index 処理に渡す index。
 * @param flag 処理に渡す flag。
 * @returns 生成または整形した文字列。
 * @throws 入力や参照先が前提を満たさない場合。
 * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
 */
function readFlagValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value) {
    throw new Error(`\`${flag}\` requires a value.`);
  }

  return value;
}

/**
 * Question を必須として検証する。
 * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
 *
 * @param positionals 処理に渡す positionals。
 * @returns 生成または整形した文字列。
 * @throws 入力や参照先が前提を満たさない場合。
 * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
 */
function requireQuestion(positionals: string[]): string {
  const question = positionals.join(" ").trim();
  if (!question) {
    throw new Error("Question is required.");
  }

  return question;
}

/**
 * Args を内部表現へ解釈する。
 * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
 *
 * @param argv 処理に渡す argv。
 * @returns ParsedArgs。
 * @remarks 入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。
 */
function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const parsed: ParsedArgs = {
    command,
    positionals: [],
    outputFormat: "text",
    files: [],
    diffs: [],
    logs: [],
  };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token) {
      continue;
    }

    if (token === "--json") {
      parsed.outputFormat = "json";
      continue;
    }

    if (token === "--session") {
      parsed.sessionId = readFlagValue(rest, index + 1, "--session");
      index += 1;
      continue;
    }

    if (token === "--provider") {
      parsed.providerName = readFlagValue(rest, index + 1, "--provider");
      index += 1;
      continue;
    }

    if (token === "--model") {
      parsed.model = readFlagValue(rest, index + 1, "--model");
      index += 1;
      continue;
    }

    if (token === "--timeout") {
      const timeout = Number(readFlagValue(rest, index + 1, "--timeout"));
      index += 1;
      if (Number.isFinite(timeout)) {
        parsed.timeoutMs = timeout;
      }
      continue;
    }

    if (token === "--cwd") {
      parsed.cwd = readFlagValue(rest, index + 1, "--cwd");
      index += 1;
      continue;
    }

    if (token === "--file") {
      parsed.files.push(readFlagValue(rest, index + 1, "--file"));
      index += 1;
      continue;
    }

    if (token === "--diff") {
      parsed.diffs.push(readFlagValue(rest, index + 1, "--diff"));
      index += 1;
      continue;
    }

    if (token === "--log") {
      parsed.logs.push(readFlagValue(rest, index + 1, "--log"));
      index += 1;
      continue;
    }

    parsed.positionals.push(token);
  }

  return parsed;
}

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
    const profile = await this.app.profileLoader.load();
    const providerName = parsed.providerName ?? profile.defaultProvider;
    const shouldUseProfileModel =
      !parsed.providerName || parsed.providerName === profile.defaultProvider;
    const model =
      parsed.model ??
      (shouldUseProfileModel ? profile.defaultModel : undefined) ??
      this.app.providerRegistry.getDefaultModel(providerName);
    const timeoutMs = parsed.timeoutMs ?? profile.defaultTimeoutMs;

    switch (parsed.command) {
      case "providers": {
        const result = await this.app.listProvidersUseCase.execute();
        const rendered = this.app.resultRenderer.render(
          result,
          parsed.outputFormat,
        );
        return { responseText: rendered.text, exitCode: 0 };
      }
      case "consult": {
        const result = await this.app.consultUseCase.execute({
          command: "consult",
          question: requireQuestion(parsed.positionals),
          files: parsed.files,
          diffs: parsed.diffs,
          logs: parsed.logs,
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
      }
      case "followup": {
        if (!parsed.sessionId) {
          throw new Error("`followup` requires --session <id>.");
        }

        const result = await this.app.followupUseCase.execute({
          question: requireQuestion(parsed.positionals),
          sessionId: parsed.sessionId,
          files: parsed.files,
          diffs: parsed.diffs,
          logs: parsed.logs,
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
      }
      case "debug": {
        const result = await this.app.debugUseCase.execute({
          question: requireQuestion(parsed.positionals),
          files: parsed.files,
          diffs: parsed.diffs,
          logs: parsed.logs,
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
      }
      case "help":
      default:
        return {
          responseText: [
            "Usage:",
            "  aipanel providers [--json]",
            "  aipanel consult <question> [--provider <name>] [--model <name>] [--file <path>] [--diff <path>] [--log <path>] [--json]",
            "  aipanel followup --session <id> <question> [--provider <name>] [--model <name>] [--json]",
            "  aipanel debug <question> [--provider <name>] [--model <name>] [--file <path>] [--diff <path>] [--log <path>] [--json]",
          ].join("\n"),
          exitCode: parsed.command === "help" ? 0 : 1,
        };
    }
  }
}
