/**
 * ProviderRegistry を定義する。
 * このファイルは、利用可能 provider の一覧・既定値・name 解決を一箇所で管理し、app/usecase が adapter 配列の詳細を持たないようにするために存在する。
 */

import type { ProviderAdapter } from "./ProviderAdapter.js";
import type { ProviderName } from "../shared/commands.js";

interface ProviderRegistryOptions {
  adapters: ProviderAdapter[];
  defaultProvider: ProviderName;
}

/**
 * Provider の解決表を管理する。
 * Claude Code と Codex の CLI 差分を provider 境界で吸収し、上位層が共通 contract だけを見れば済むようにする。
 */
export class ProviderRegistry {
  readonly #adapters: Map<ProviderName, ProviderAdapter>;
  readonly #defaultProvider: ProviderName;

  constructor(options: ProviderRegistryOptions) {
    this.#adapters = new Map(
      options.adapters.map((adapter) => [adapter.name, adapter]),
    );
    this.#defaultProvider = options.defaultProvider;
  }

  /**
   * 項目 を一覧化する。
   * Claude Code と Codex の CLI 差分を provider 境界で吸収し、上位層が共通 contract だけを見れば済むようにする。
   *
   * @returns 収集した ProviderName の一覧。
   */
  list(): ProviderName[] {
    return [...this.#adapters.keys()].sort((first, second) =>
      first.localeCompare(second),
    );
  }

  /**
   * 対象の値 を取得する。
   * Claude Code と Codex の CLI 差分を provider 境界で吸収し、上位層が共通 contract だけを見れば済むようにする。
   *
   * @param name 処理に渡す name。
   * @returns ProviderAdapter。
   * @throws 入力や参照先が前提を満たさない場合。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  get(name?: ProviderName): ProviderAdapter {
    const providerName = name ?? this.#defaultProvider;
    const adapter = this.#adapters.get(providerName);
    if (!adapter) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    return adapter;
  }
}
