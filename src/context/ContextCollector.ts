import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { createId } from "../shared/ids.js";
import { systemClock } from "../shared/clock.js";
import { readText } from "../shared/file-system.js";

type ContextEntryKind = "file" | "diff" | "log";

interface ContextEntry {
  path: string;
  absolutePath: string;
  purpose: ContextEntryKind;
  source: ContextEntryKind;
  checksum: string;
  capturedAt: string;
  summary: string;
  content: string;
}

export interface ContextBundleLike {
  contextId: string;
  runId: string | null;
  summary: string;
  files: ContextEntry[];
  diffs: ContextEntry[];
  logs: ContextEntry[];
  metadata: {
    cwd: string;
    question: string;
    collectedAt: string;
  };
}

interface ContextCollectInput {
  question?: string;
  files?: string[];
  diffs?: string[];
  logs?: string[];
  cwd?: string;
}

function hashContent(content: string): string {
  return createHash("sha1").update(content).digest("hex");
}

function summarizeCollection(
  files: ContextEntry[],
  diffs: ContextEntry[],
  logs: ContextEntry[],
): string {
  const parts = [];
  if (files.length > 0) parts.push(`${files.length} files`);
  if (diffs.length > 0) parts.push(`${diffs.length} diffs`);
  if (logs.length > 0) parts.push(`${logs.length} logs`);
  return parts.length > 0
    ? `Collected ${parts.join(", ")}.`
    : "No external context was collected.";
}

export class ContextCollector {
  readonly cwd: string;

  readonly clock: typeof systemClock;

  constructor({
    cwd = process.cwd(),
    clock = systemClock,
  }: { cwd?: string; clock?: typeof systemClock } = {}) {
    this.cwd = cwd;
    this.clock = clock;
  }

  async collect({
    question = "",
    files = [],
    diffs = [],
    logs = [],
    cwd = this.cwd,
  }: ContextCollectInput = {}): Promise<ContextBundleLike> {
    const [fileEntries, diffEntries, logEntries] = await Promise.all([
      this.#readEntries(files, "file", cwd),
      this.#readEntries(diffs, "diff", cwd),
      this.#readEntries(logs, "log", cwd),
    ]);

    return {
      contextId: createId("ctx"),
      runId: null,
      summary: summarizeCollection(fileEntries, diffEntries, logEntries),
      files: fileEntries,
      diffs: diffEntries,
      logs: logEntries,
      metadata: {
        cwd,
        question,
        collectedAt: this.clock.nowIso(),
      },
    };
  }

  formatForPrompt(contextBundle: ContextBundleLike): string {
    const sections: string[] = [];

    if (contextBundle.summary) {
      sections.push(`Context summary:\n${contextBundle.summary}`);
    }

    for (const file of contextBundle.files ?? []) {
      sections.push(`File: ${file.path}\n${file.content}`);
    }

    for (const diff of contextBundle.diffs ?? []) {
      sections.push(`Diff: ${diff.path}\n${diff.content}`);
    }

    for (const log of contextBundle.logs ?? []) {
      sections.push(`Log: ${log.path}\n${log.content}`);
    }

    return sections.join("\n\n").trim();
  }

  async #readEntries(
    paths: string[],
    kind: ContextEntryKind,
    cwd: string,
  ): Promise<ContextEntry[]> {
    const entries: ContextEntry[] = [];

    for (const rawPath of paths) {
      const absolutePath = resolve(cwd, rawPath);
      const content = await readText(absolutePath, "utf8");
      entries.push({
        path: rawPath,
        absolutePath,
        purpose: kind,
        source: kind,
        checksum: hashContent(content),
        capturedAt: this.clock.nowIso(),
        summary: `${kind} from ${rawPath}`,
        content,
      });
    }

    return entries;
  }
}
