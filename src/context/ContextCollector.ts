/**
 * ContextCollector を定義する。
 * このファイルは、prompt 実行時に残す最小 context を一箇所で決め、consult / followup / debug が同じ収集方針を使えるようにするために存在する。
 */

import { createId } from "../shared/ids.js";
import { systemClock } from "../shared/clock.js";

export interface RunContextLike {
  runContextId: string;
  runId: string | null;
  summary: string;
  question: string;
  cwd: string;
  collectedAt: string;
}

interface ContextCollectInput {
  question: string;
  cwd?: string;
}

/**
 * Context を収集する役を定義する。
 * prompt 実行に必要な最小 context 収集を一箇所で決め、command ごとに入力メタデータ収集がぶれないようにする。
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
   * @returns RunContextLike を解決する Promise。
   */
  async collect({
    question,
    cwd = this.cwd,
  }: ContextCollectInput): Promise<RunContextLike> {
    return {
      runContextId: createId("runctx"),
      runId: null,
      summary: "Prompt-only execution without external context attachments.",
      question,
      cwd,
      collectedAt: this.clock.nowIso(),
    };
  }
}
