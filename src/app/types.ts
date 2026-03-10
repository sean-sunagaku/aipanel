export type WorkflowMode = "direct" | "orchestrated";
export type OutputFormat = "text" | "json";
export type CommandName =
  | "providers"
  | "consult"
  | "followup"
  | "debug"
  | "compare"
  | "help";

export interface CommandFlags {
  json: boolean;
  mode?: WorkflowMode;
  provider?: string;
  sessionId?: string;
  model?: string;
  timeoutMs?: number;
  cwd?: string;
  files: string[];
  logs: string[];
  diffs: string[];
}

export interface CommandRoute {
  command: CommandName;
  args: string[];
  flags: CommandFlags;
  outputFormat: OutputFormat;
}

export interface AppResult {
  exitCode: number;
  payload: unknown;
}

export interface ProviderDescriptor {
  name: string;
  defaultModel: string;
  supportsNativeResumeHint: boolean;
  phase: "phase-1";
}

export interface Profile {
  defaultProvider: string;
  defaultModel: string;
  storageRoot: string;
}
