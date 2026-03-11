import {
  getString,
  getStringArray,
  getStringLiteral,
  parseJsonRecord,
} from "./jsonRecord.js";
import { literalTuple } from "../../src/shared/literalTuple.js";

const providerPayloadKinds = literalTuple("providers");
const consultationPayloadKinds = literalTuple("consultation");
const debugPayloadKinds = literalTuple("debug");
const runResultStatuses = literalTuple("completed", "partial");

export interface ProvidersPayload {
  kind: "providers";
  providers: string[];
}

export interface ConsultationPayload {
  kind: "consultation";
  sessionId: string;
  runId: string;
  answer: string;
  provider: string;
  model: string;
  status: "completed" | "partial";
  reviewStatus: string;
}

export interface DebugPayload {
  kind: "debug";
  sessionId: string;
  runId: string;
  provider: string;
  model: string;
  summary: string;
  details: string[];
  status: "completed" | "partial";
}

export function parseProvidersPayload(stdout: string): ProvidersPayload {
  const record = parseJsonRecord(stdout);
  return {
    kind: getStringLiteral(record, "kind", providerPayloadKinds),
    providers: getStringArray(record, "providers"),
  };
}

export function parseConsultationPayload(stdout: string): ConsultationPayload {
  const record = parseJsonRecord(stdout);
  return {
    kind: getStringLiteral(record, "kind", consultationPayloadKinds),
    sessionId: getString(record, "sessionId"),
    runId: getString(record, "runId"),
    answer: getString(record, "answer"),
    provider: getString(record, "provider"),
    model: getString(record, "model"),
    status: getStringLiteral(record, "status", runResultStatuses),
    reviewStatus: getString(record, "reviewStatus"),
  };
}

export function parseDebugPayload(stdout: string): DebugPayload {
  const record = parseJsonRecord(stdout);
  return {
    kind: getStringLiteral(record, "kind", debugPayloadKinds),
    sessionId: getString(record, "sessionId"),
    runId: getString(record, "runId"),
    provider: getString(record, "provider"),
    model: getString(record, "model"),
    summary: getString(record, "summary"),
    details: getStringArray(record, "details"),
    status: getStringLiteral(record, "status", runResultStatuses),
  };
}
