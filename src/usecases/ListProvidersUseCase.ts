/**
 * List Providers Use Case を定義する。
 * このファイルは、利用可能 provider の一覧取得を use case として切り出し、CLI command が registry 参照の詳細を直接持たないようにするために存在する。
 */

import type { ProviderName } from "../shared/commands.js";
import type { ProvidersPayload } from "../shared/cli-contract.js";
import type { ProviderRegistry } from "../providers/ProviderRegistry.js";

/**
 * List Providers command の実行手順を定義する。
 * command 実行手順を use case に閉じ込め、CLI / app 層から provider 呼び出し順や state update を切り離す。
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
   * @returns ProvidersPayload を解決する Promise。
   */
  async execute(): Promise<ProvidersPayload> {
    return {
      kind: "providers",
      providers: this.providerRegistry.list(),
    };
  }
}
