export type CliCommand = "help" | "providers" | "consult" | "followup" | "debug";
export type ConsultationCommand = "consult" | "followup";
export type ProviderName = "claude-code" | "codex";
export type OutputFormat = "text" | "json";

export const CLI_COMMANDS: readonly CliCommand[] = [
  "help",
  "providers",
  "consult",
  "followup",
  "debug",
];
export type ParsedCommand = CliCommand | "unknown";

export const CONSULT_COMMANDS: readonly ConsultationCommand[] = [
  "consult",
  "followup",
];

export const PROVIDER_NAMES: readonly ProviderName[] = ["claude-code", "codex"];
export const DEFAULT_PROVIDER: ProviderName = PROVIDER_NAMES[0];

/**
 * CLI コマンド文字列かどうかを判定する。
 * 文字列比較で既知コマンド集合に含まれるかを見て判定する。
 *
 * @param value 判定対象文字列。
 * @returns CLI コマンドに一致すれば true。
 */
export function isCliCommand(value: string): value is CliCommand {
  return CLI_COMMANDS.some((command) => command === value);
}

/**
 * provider 名称かどうかを判定する。
 * 定義済み provider 一覧に含まれるかを確認する。
 *
 * @param value 判定対象文字列。
 * @returns ProviderName に一致すれば true。
 */
export function isProviderName(value: string): value is ProviderName {
  return PROVIDER_NAMES.some((provider) => provider === value);
}
