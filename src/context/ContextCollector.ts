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

/**
 * Content からハッシュ値を計算する。
 * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
 *
 * @param content 処理対象のテキスト。
 * @returns 生成または整形した文字列。
 */
function hashContent(content: string): string {
  return createHash("sha1").update(content).digest("hex");
}

/**
 * Collection を要約する。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param files 処理に渡す files。
 * @param diffs 処理に渡す diffs。
 * @param logs 処理に渡す logs。
 * @returns 生成または整形した文字列。
 * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
 */
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

/**
 * Context を収集して束ねる。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 */
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

  /**
   * 情報 を集めて束ねる。
   * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
   *
   * @param options この宣言に必要なオプション。
   * @returns ContextBundleLike を解決する Promise。
   */
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

  /**
   * For Prompt を表示や送信向けに整形する。
   * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
   *
   * @param contextBundle 処理に渡す context Bundle。
   * @returns 生成または整形した文字列。
   * @remarks 入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。
   */
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

  /**
   * #read Entries を担当する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param paths 処理に渡す paths。
   * @param kind 処理に渡す kind。
   * @param cwd 処理の基準ディレクトリ。
   * @returns ContextEntry[] を解決する Promise。
   */
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
