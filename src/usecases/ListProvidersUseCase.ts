import type { ProviderRegistry } from "../providers/ProviderRegistry.js";

export class ListProvidersUseCase {
  readonly providerRegistry: ProviderRegistry;

  constructor(providerRegistry: ProviderRegistry) {
    this.providerRegistry = providerRegistry;
  }

  async execute() {
    return {
      kind: "providers" as const,
      providers: this.providerRegistry.list(),
    };
  }
}
