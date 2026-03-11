/**
 * Followup Use Case を定義する。
 * このファイルは、followup を consult 実装へ委譲する薄い専用入口を持ち、CLI 上の command 区別を保ったまま direct flow を再利用するために存在する。
 */

import {
  ConsultUseCase,
  type ConsultationInput,
} from "./ConsultUseCase.js";
import type {
  BatchPayload,
  ConsultationBatchOutput,
} from "../shared/cli-contract.js";

/**
 * Followup command の実行手順を定義する。
 * command 実行手順を use case に閉じ込め、CLI / app 層から provider 呼び出し順や state update を切り離す。
 */
export class FollowupUseCase {
  readonly consultUseCase: ConsultUseCase;

  constructor(consultUseCase: ConsultUseCase) {
    this.consultUseCase = consultUseCase;
  }

  /**
   * execute を担当する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param input この処理に渡す入力。
   * @returns BatchPayload<ConsultationBatchOutput> を解決する Promise。
   */
  async execute(
    input: Omit<Extract<ConsultationInput, { command: "followup" }>, "command">,
  ): Promise<BatchPayload<ConsultationBatchOutput>> {
    return this.consultUseCase.execute({
      ...input,
      command: "followup",
    });
  }
}
