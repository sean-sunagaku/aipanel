/**
 * CLI command と provider の共通定義をまとめる。
 * このファイルは、CLI command と provider 名の canonical literal を共有し、parse / routing / usecase 間で同じ定義を使うために存在する。
 */

export type CliCommand =
  | "help"
  | "providers"
  | "consult"
  | "followup"
  | "debug"
  | "plan";
export type ConsultationCommand = "consult" | "followup";
export type ProviderName = "claude-code" | "codex";
export type OutputFormat = "text" | "json";

export interface ProviderSpec {
  readonly name: ProviderName;
  readonly model?: string;
}

export const CLI_COMMANDS: readonly CliCommand[] = [
  "help",
  "providers",
  "consult",
  "followup",
  "debug",
  "plan",
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

/**
 * `--provider` の値を内部表現へ解釈する。
 * public CLI では `provider` または `provider:model` を受け付け、model override を provider 指定に同居させる。
 *
 * @param value 処理に渡す値。
 * @returns provider 名と optional model を持つ内部表現。
 * @throws 入力が既知 provider を満たさない場合。
 * @remarks `:` を含む model 名も受けられるよう、最初の要素だけを provider として検証し、残りは model へ戻している。
 */
export function parseProviderSpec(value: string): ProviderSpec {
  const [providerCandidate = "", ...modelParts] = value.split(":");
  if (!isProviderName(providerCandidate)) {
    throw new Error(`Unknown provider: ${value}`);
  }

  if (modelParts.length === 0) {
    return { name: providerCandidate };
  }

  const model = modelParts.join(":").trim();
  if (!model) {
    throw new Error(`Invalid provider spec: ${value}`);
  }

  return { name: providerCandidate, model };
}
