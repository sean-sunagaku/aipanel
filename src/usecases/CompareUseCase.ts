export class CompareUseCase {
  async execute() {
    return {
      kind: "message" as const,
      message: "compare is reserved for phase 2.",
    };
  }
}
