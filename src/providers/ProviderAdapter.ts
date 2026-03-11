import type { ProviderName } from "../shared/commands.js";

/**
 * プロバイダー呼び出しに必要な入力をまとめる。
 *
 * 実行系ごとの差分を上位層へ漏らさず、同じ形でアダプターを呼び出せるようにする。
 */
export interface ProviderCallPlan {
  provider: ProviderName;
  prompt: string;
  cwd: string;
  timeoutMs: number;
  model?: string;
}

/**
 * プロバイダー呼び出しの戻り値を共通形式で表す。
 *
 * プロバイダーごとのレスポンス差分をここで吸収し、比較や保存の後続処理を単純に保つ。
 */
export interface ProviderCallResult {
  provider: ProviderName;
  model: string;
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

/**
 * 外部 AI プロバイダーを同じ呼び出し面で扱うための契約を表す。
 *
 * 上位層が Claude Code と Codex の違いを意識せずに実行できるようにする。
 */
export interface ProviderAdapter {
  readonly name: ProviderName;
  readonly defaultModel?: string;

  /**
   * 共通の呼び出し計画を実際のプロバイダー実行へ変換して結果を返す。
   *
   * 各プロバイダー固有の実行方法を adapter 内へ閉じ込め、上位層の分岐を増やさない。
   *
   * @param plan 実行に必要な共通入力。
   * @returns 共通形式へ正規化した呼び出し結果。
   */
  call(plan: ProviderCallPlan): Promise<ProviderCallResult>;
}
