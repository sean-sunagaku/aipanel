/**
 * CLI command と provider の共通定義をまとめる。
 * このファイルは、CLI command と provider 名の canonical literal を共有し、parse / routing / usecase 間で同じ定義を使うために存在する。
 */

export type CliCommand =
  | "help"
  | "providers"
  | "consult"
  | "followup"
  | "debug";
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
export const DEFAULT_PROVIDER: ProviderName = "claude-code";

/**
 * Cli Command を満たすか判定する。
 * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns value is CliCommand。
 */
export function isCliCommand(value: string): value is CliCommand {
  return CLI_COMMANDS.some((command) => command === value);
}

/**
 * Provider Name を満たすか判定する。
 * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns value is ProviderName。
 */
export function isProviderName(value: string): value is ProviderName {
  return PROVIDER_NAMES.some((provider) => provider === value);
}
