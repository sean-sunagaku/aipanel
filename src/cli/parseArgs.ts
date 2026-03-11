import {
  type CliCommand,
  isCliCommand,
  isProviderName,
  type ParsedCommand,
  type ProviderName,
  type OutputFormat,
} from "../shared/commands.js";

export type { OutputFormat };
export type { CliCommand };
export type { ParsedCommand };

export interface ParsedArgs {
  readonly command: ParsedCommand;
  readonly positionals: readonly string[];
  readonly outputFormat: OutputFormat;
  readonly sessionId: string | undefined;
  readonly providerName: ProviderName | undefined;
  readonly model: string | undefined;
  readonly timeoutMs: number | undefined;
  readonly cwd: string | undefined;
  readonly files: readonly string[];
  readonly diffs: readonly string[];
  readonly logs: readonly string[];
}

/**
 * Flag の値を取り出す。
 * `--flag` の次トークンを値として取得し、未指定なら明示エラーにする。
 *
 * @param args CLI 引数。
 * @param index 取得対象のインデックス。
 * @param flag 期待しているフラグ名。
 * @returns 取得した文字列。
 */
function readFlagValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value) {
    throw new Error(`\`${flag}\` requires a value.`);
  }

  return value;
}

/**
 * Args を内部表現へ解釈する。
 * 値の形は `ParsedArgs` として不変に公開し、呼び出し側で再解釈を繰り返さない。
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const parsedCommand: ParsedCommand = isCliCommand(command)
    ? command
    : "unknown";

  const positionals: string[] = [];
  const files: string[] = [];
  const diffs: string[] = [];
  const logs: string[] = [];

  let sessionId: string | undefined;
  let providerName: ProviderName | undefined;
  let model: string | undefined;
  let timeoutMs: number | undefined;
  let cwd: string | undefined;
  let outputFormat: OutputFormat = "text";

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token) {
      continue;
    }

    if (token === "--json") {
      outputFormat = "json";
      continue;
    }

    if (token === "--session") {
      sessionId = readFlagValue(rest, index + 1, "--session");
      index += 1;
      continue;
    }

    if (token === "--provider") {
      const candidate = readFlagValue(rest, index + 1, "--provider");
      if (!isProviderName(candidate)) {
        throw new Error(`Unknown provider: ${candidate}`);
      }

      providerName = candidate;
      index += 1;
      continue;
    }

    if (token === "--model") {
      model = readFlagValue(rest, index + 1, "--model");
      index += 1;
      continue;
    }

    if (token === "--timeout") {
      const timeout = Number(readFlagValue(rest, index + 1, "--timeout"));
      index += 1;
      if (Number.isFinite(timeout)) {
        timeoutMs = timeout;
      }
      continue;
    }

    if (token === "--cwd") {
      cwd = readFlagValue(rest, index + 1, "--cwd");
      index += 1;
      continue;
    }

    if (token === "--file") {
      files.push(readFlagValue(rest, index + 1, "--file"));
      index += 1;
      continue;
    }

    if (token === "--diff") {
      diffs.push(readFlagValue(rest, index + 1, "--diff"));
      index += 1;
      continue;
    }

    if (token === "--log") {
      logs.push(readFlagValue(rest, index + 1, "--log"));
      index += 1;
      continue;
    }

    positionals.push(token);
  }

  return Object.freeze({
    command: parsedCommand,
    positionals: Object.freeze(positionals),
    outputFormat,
    sessionId,
    providerName,
    model,
    timeoutMs,
    cwd,
    files: Object.freeze(files),
    diffs: Object.freeze(diffs),
    logs: Object.freeze(logs),
  });
}
