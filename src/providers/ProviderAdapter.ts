export interface ProviderCallPlan {
  provider: string;
  prompt: string;
  cwd: string;
  timeoutMs: number;
  model?: string;
}

export interface ProviderCallResult {
  provider: string;
  rawText: string;
  rawJson: unknown;
  usage: {
    inputTokens?: number | null;
    outputTokens?: number | null;
    costUsd?: number | null;
    latencyMs?: number | null;
  };
  externalRefs: Array<{ system: string; id: string; scope: string }>;
  citations: Array<{
    kind: string;
    label?: string | null;
    pathOrUrl?: string | null;
    line?: number | null;
  }>;
  isError: boolean;
  subtype: string | null;
}

export interface ProviderAdapter {
  readonly name: string;
  call(plan: ProviderCallPlan): Promise<ProviderCallResult>;
}
