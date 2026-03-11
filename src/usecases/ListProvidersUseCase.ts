import type { ProviderRegistry } from "../providers/ProviderRegistry.js";

/**
 * List Providers のユースケースを組み立てて実行する。
 * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
 */
export class ListProvidersUseCase {
  readonly providerRegistry: ProviderRegistry;

  constructor(providerRegistry: ProviderRegistry) {
    this.providerRegistry = providerRegistry;
  }

  /**
   * execute を担当する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @returns 処理結果。
   */
  async execute() {
    return {
      kind: "providers" as const,
      providers: this.providerRegistry.list(),
    };
  }
}
