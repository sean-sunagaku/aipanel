import { ConsultUseCase, type ConsultationResult } from "./ConsultUseCase.js";

/**
 * Followup のユースケースを組み立てて実行する。
 * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
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
   * @returns ConsultationResult を解決する Promise。
   */
  async execute(
    input: Omit<Parameters<ConsultUseCase["execute"]>[0], "command">,
  ): Promise<ConsultationResult> {
    return this.consultUseCase.execute({
      ...input,
      command: "followup",
    });
  }
}
