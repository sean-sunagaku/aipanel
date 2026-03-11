/**
 * CLI JSON 入出力の共有契約を定義する。
 * このファイルは、use case / renderer / test helper が同じ batch JSON shape を参照し、public contract の drift を防ぐために存在する。
 */

import { match } from "ts-pattern";
import type { RunResultStatus, RunReviewStatus } from "../domain/run.js";
import type { ProviderName } from "./commands.js";
import { literalTuple } from "./literalTuple.js";

export const cliResponseKinds = literalTuple("providers", "batch");
export const batchCommands = literalTuple("consult", "followup", "debug");
export const batchOutputKinds = literalTuple("consultation", "debug");

export type BatchCommand = (typeof batchCommands)[number];

export interface ProvidersPayload {
  readonly kind: "providers";
  readonly providers: ProviderName[];
}

export interface ConsultationBatchOutput {
  readonly kind: "consultation";
  readonly answer: string;
}

export interface DebugBatchOutput {
  readonly kind: "debug";
  readonly summary: string;
  readonly details: string[];
}

export type BatchResultOutput = ConsultationBatchOutput | DebugBatchOutput;

export interface BatchResult<
  TOutput extends BatchResultOutput = BatchResultOutput,
> {
  readonly provider: ProviderName;
  readonly sessionId?: string;
  readonly status: RunResultStatus;
  readonly reviewStatus?: RunReviewStatus;
  readonly errorMessage?: string;
  readonly output: TOutput;
}

export interface BatchPayload<
  TOutput extends BatchResultOutput = BatchResultOutput,
> {
  readonly kind: "batch";
  readonly command: BatchCommand;
  readonly runId: string;
  readonly status: RunResultStatus;
  readonly reviewStatus?: RunReviewStatus;
  readonly results: readonly BatchResult<TOutput>[];
}

export type CliJsonPayload = ProvidersPayload | BatchPayload;

/**
 * result 群から batch status を集約する。
 * 個別 result の失敗有無を top-level status へ集約し、CLI caller が 1 箇所だけ見ればよいようにする。
 *
 * @param results 集約対象の result 群。
 * @returns Batch 全体の status。
 */
export function deriveBatchStatus(
  results: readonly Pick<BatchResult, "status">[],
): RunResultStatus {
  return match(results.some((result) => result.status === "partial"))
    .returnType<RunResultStatus>()
    .with(true, () => "partial")
    .otherwise(() => "completed");
}

/**
 * review status 群から batch review status を集約する。
 * reviewer ごとの review 状態を batch 全体へ丸め、caller が warning 状態を見落とさないようにする。
 *
 * @param results 集約対象の result 群。
 * @returns 集約後の review status。対象が無ければ `undefined`。
 */
export function deriveBatchReviewStatus(
  results: readonly Pick<BatchResult, "reviewStatus">[],
): RunReviewStatus | undefined {
  const reviewStatuses = results
    .map((result) => result.reviewStatus)
    .filter((value): value is RunReviewStatus => value !== undefined);

  if (reviewStatuses.length === 0) {
    return undefined;
  }

  return match(reviewStatuses.some((value) => value === "needs-review"))
    .returnType<RunReviewStatus>()
    .with(true, () => "needs-review")
    .otherwise(() => "ready");
}
