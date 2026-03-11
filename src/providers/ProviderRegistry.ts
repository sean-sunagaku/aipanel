import type { ProviderAdapter } from "./ProviderAdapter.js";

interface ProviderRegistryOptions {
  adapters: ProviderAdapter[];
  defaultProvider: string;
}

export class ProviderRegistry {
  readonly #adapters: Map<string, ProviderAdapter>;
  readonly #defaultProvider: string;

  constructor(options: ProviderRegistryOptions) {
    this.#adapters = new Map(
      options.adapters.map((adapter) => [adapter.name, adapter]),
    );
    this.#defaultProvider = options.defaultProvider;
  }

  list(): string[] {
    return [...this.#adapters.keys()].sort();
  }

  getDefaultModel(name?: string): string | undefined {
    return this.get(name).defaultModel;
  }

  get(name?: string): ProviderAdapter {
    const providerName = name ?? this.#defaultProvider;
    const adapter = this.#adapters.get(providerName);
    if (!adapter) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    return adapter;
  }
}
