import type {
  BatchPayload,
  BatchResult,
  BatchResultOutput,
  ConsultationBatchOutput,
  DebugBatchOutput,
  ProvidersPayload,
} from "../../src/shared/cli-contract.js";
import {
  batchCommands,
  batchOutputKinds,
} from "../../src/shared/cli-contract.js";
import { PROVIDER_NAMES } from "../../src/shared/commands.js";
import { runResultStatuses, runReviewStatuses } from "../../src/domain/run.js";
import {
  getOptionalString,
  getRecord,
  getRecordArray,
  getString,
  getStringArray,
  getStringLiteral,
  parseJsonRecord,
} from "./jsonRecord.js";
import { literalTuple } from "../../src/shared/literalTuple.js";

const providerPayloadKinds = literalTuple("providers");
const batchPayloadKinds = literalTuple("batch");

function getOptionalStringLiteral<T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  allowed: T,
): T[number] | undefined {
  const value = getOptionalString(record, key);
  if (value === undefined) {
    return undefined;
  }

  for (const candidate of allowed) {
    if (candidate === value) {
      return candidate;
    }
  }

  throw new Error(`Expected ${key} to be one of: ${allowed.join(", ")}`);
}

function parseProviderName(value: string): (typeof PROVIDER_NAMES)[number] {
  for (const providerName of PROVIDER_NAMES) {
    if (providerName === value) {
      return providerName;
    }
  }

  throw new Error(
    `Expected provider to be one of: ${PROVIDER_NAMES.join(", ")}`,
  );
}

function parseBatchOutput(record: Record<string, unknown>): BatchResultOutput {
  const kind = getStringLiteral(record, "kind", batchOutputKinds);
  if (kind === "consultation") {
    return {
      kind,
      answer: getString(record, "answer"),
    };
  }

  return {
    kind,
    summary: getString(record, "summary"),
    details: getStringArray(record, "details"),
  };
}

function parseBatchResult(record: Record<string, unknown>): BatchResult {
  const sessionId = getOptionalString(record, "sessionId");
  const reviewStatus = getOptionalStringLiteral(
    record,
    "reviewStatus",
    runReviewStatuses,
  );
  const errorMessage = getOptionalString(record, "errorMessage");

  return {
    provider: getStringLiteral(record, "provider", PROVIDER_NAMES),
    ...(sessionId !== undefined ? { sessionId } : {}),
    status: getStringLiteral(record, "status", runResultStatuses),
    ...(reviewStatus !== undefined ? { reviewStatus } : {}),
    ...(errorMessage !== undefined ? { errorMessage } : {}),
    output: parseBatchOutput(getRecord(record, "output")),
  };
}

export function parseProvidersPayload(stdout: string): ProvidersPayload {
  const record = parseJsonRecord(stdout);
  return {
    kind: getStringLiteral(record, "kind", providerPayloadKinds),
    providers: getStringArray(record, "providers").map((provider) =>
      parseProviderName(provider),
    ),
  };
}

export function parseBatchPayload(stdout: string): BatchPayload {
  const record = parseJsonRecord(stdout);
  const reviewStatus = getOptionalStringLiteral(
    record,
    "reviewStatus",
    runReviewStatuses,
  );

  return {
    kind: getStringLiteral(record, "kind", batchPayloadKinds),
    command: getStringLiteral(record, "command", batchCommands),
    runId: getString(record, "runId"),
    status: getStringLiteral(record, "status", runResultStatuses),
    ...(reviewStatus !== undefined ? { reviewStatus } : {}),
    results: getRecordArray(record, "results").map((item) =>
      parseBatchResult(item),
    ),
  };
}

export function parseConsultationBatchPayload(
  stdout: string,
): BatchPayload<ConsultationBatchOutput> {
  const payload = parseBatchPayload(stdout);
  if (payload.command !== "consult" && payload.command !== "followup") {
    throw new Error(
      `Expected consultation batch payload but received ${payload.command}.`,
    );
  }

  return {
    ...payload,
    results: payload.results.map((result) => {
      if (result.output.kind !== "consultation") {
        throw new Error(
          "Expected consultation output in consultation batch payload.",
        );
      }

      return {
        ...result,
        output: result.output,
      };
    }),
  };
}

export function parseDebugBatchPayload(
  stdout: string,
): BatchPayload<DebugBatchOutput> {
  const payload = parseBatchPayload(stdout);
  if (payload.command !== "debug") {
    throw new Error(
      `Expected debug batch payload but received ${payload.command}.`,
    );
  }

  return {
    ...payload,
    results: payload.results.map((result) => {
      if (result.output.kind !== "debug") {
        throw new Error("Expected debug output in debug batch payload.");
      }

      return {
        ...result,
        output: result.output,
      };
    }),
  };
}

export type { BatchPayload };
