import type { ProviderAdapter } from "./ProviderAdapter.js";
import type { ProviderName } from "../shared/commands.js";

interface ProviderRegistryOptions {
  adapters: ProviderAdapter[];
  defaultProvider: ProviderName;
}

/**
 * Provider を名前で解決できるように管理する。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
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
   * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
   *
   * @returns 収集した string の一覧。
   */
  list(): ProviderName[] {
    return [...this.#adapters.keys()].sort((first, second) =>
      first.localeCompare(second),
    );
  }

  /**
   * Default Model を取得する。
   * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
   *
   * @param name 処理に渡す name。
   * @returns string | undefined。
   */
  getDefaultModel(name?: ProviderName): string | undefined {
    return this.get(name).defaultModel;
  }

  /**
   * 対象の値 を取得する。
   * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
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
