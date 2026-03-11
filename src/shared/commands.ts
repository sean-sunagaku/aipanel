export const CLI_COMMANDS = [
  "help",
  "providers",
  "consult",
  "followup",
  "debug",
] as const;
export type CliCommand = (typeof CLI_COMMANDS)[number];
export type ParsedCommand = CliCommand | "unknown";

export const CONSULT_COMMANDS = ["consult", "followup"] as const;
export type ConsultationCommand = (typeof CONSULT_COMMANDS)[number];

export const PROVIDER_NAMES = ["claude-code", "codex"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];
export const DEFAULT_PROVIDER: ProviderName = PROVIDER_NAMES[0];
export type OutputFormat = "text" | "json";

export function isCliCommand(value: string): value is CliCommand {
  return (CLI_COMMANDS as readonly string[]).includes(value);
}

export function isProviderName(value: string): value is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(value);
}
