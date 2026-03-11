/**
 * CLI 引数の解析ルールを定義する。
 * このファイルは、argv を `aipanel` 内部の不変 command 入力へ変換し、後続層でフラグ解釈を再実装しないようにするために存在する。
 */

import {
  type CliCommand,
  isCliCommand,
  parseProviderSpec,
  type ParsedCommand,
  type OutputFormat,
  type ProviderSpec,
} from "../shared/commands.js";

export type { OutputFormat };
export type { CliCommand };
export type { ParsedCommand };

export interface ParsedArgs {
  readonly command: ParsedCommand;
  readonly positionals: readonly string[];
  readonly outputFormat: OutputFormat;
  readonly sessionId: string | undefined;
  readonly filePath: string | undefined;
  readonly providers: readonly ProviderSpec[];
  readonly timeoutMs: number | undefined;
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
 * `--provider` 引数を reviewer 指定へ変換する。
 * public CLI の `provider[:model]` 書式を一箇所で解釈し、parser の分岐を後続へ漏らさないようにする。
 *
 * @param args 処理に渡す args。
 * @param index `--provider` 値の位置。
 * @returns 解釈済み provider 指定。
 */
function readProviderSpec(args: string[], index: number): ProviderSpec {
  const value = readFlagValue(args, index, "--provider");
  return parseProviderSpec(value);
}

/**
 * Args を内部表現へ解釈する。
 * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
 *
 * @param argv 処理に渡す argv。
 * @returns ParsedArgs。
 * @throws 入力や参照先が前提を満たさない場合。
 * @remarks 入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const parsedCommand: ParsedCommand = isCliCommand(command)
    ? command
    : "unknown";

  const positionals: string[] = [];

  let sessionId: string | undefined;
  let filePath: string | undefined;
  const providers: ProviderSpec[] = [];
  let timeoutMs: number | undefined;
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

    if (token === "--file") {
      filePath = readFlagValue(rest, index + 1, "--file");
      index += 1;
      continue;
    }

    if (token === "--provider") {
      providers.push(readProviderSpec(rest, index + 1));
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

    if (token.startsWith("--")) {
      throw new Error(`Unknown option: ${token}`);
    }

    positionals.push(token);
  }

  return Object.freeze({
    command: parsedCommand,
    positionals: Object.freeze(positionals),
    outputFormat,
    sessionId,
    filePath,
    providers: Object.freeze(providers),
    timeoutMs,
  });
}
