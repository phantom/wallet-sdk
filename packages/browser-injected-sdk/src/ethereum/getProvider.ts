import { InjectedEthereumStrategy } from "./strategies/injected";
import type { EthereumStrategy } from "./strategies/types";
import { ProviderStrategy } from "../types";

/**
 * Retrieves Phantom Ethereum provider and returns it if it exists.
 * @returns Phantom Ethereum provider or throws error if it doesn't exist.
 */
export async function getProvider(strategy: ProviderStrategy = ProviderStrategy.INJECTED): Promise<EthereumStrategy> {
  if (strategy === "injected") {
    const provider = new InjectedEthereumStrategy();
    try {
      await provider.load();
      return provider;
    } catch (error) {
      throw new Error("Provider not found.");
    }
  } else {
    throw new Error("Invalid provider type.");
  }
}
