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

function readFlagValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value) {
    throw new Error(`\`${flag}\` requires a value.`);
  }

  return value;
}

function requireQuestion(positionals: string[]): string {
  const question = positionals.join(" ").trim();
  if (!question) {
    throw new Error("Question is required.");
  }

  return question;
}

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

export class CommandRouter {
  readonly app: AipanelApp;

  constructor(app: AipanelApp) {
    this.app = app;
  }

  async route(argv: string[]): Promise<{ output: string; exitCode: number }> {
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
        return { output: rendered.text, exitCode: 0 };
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
          output: rendered.text,
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
          output: rendered.text,
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
          output: rendered.text,
          exitCode: result.status === "partial" ? 2 : 0,
        };
      }
      case "help":
      default:
        return {
          output: [
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
