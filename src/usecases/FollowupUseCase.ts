import { ConsultUseCase, type ConsultationResult } from "./ConsultUseCase.js";

export class FollowupUseCase {
  readonly consultUseCase: ConsultUseCase;

  constructor(consultUseCase: ConsultUseCase) {
    this.consultUseCase = consultUseCase;
  }

  async execute(
    input: Omit<Parameters<ConsultUseCase["execute"]>[0], "command">,
  ): Promise<ConsultationResult> {
    return this.consultUseCase.execute({
      ...input,
      command: "followup",
    });
  }
}
