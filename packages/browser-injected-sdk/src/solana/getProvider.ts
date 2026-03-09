import { InjectedSolanaStrategy } from "./strategies/injected";
import type { SolanaStrategy } from "./strategies/types";
import { ProviderStrategy } from "../types";

/**
 * Retrieves Phantom injected provider and returns it if it exists.
 * @returns Phantom injected provider or throws error if it doesn't exist.
 */
export async function getProvider(strategy: ProviderStrategy = ProviderStrategy.INJECTED): Promise<SolanaStrategy> {
  if (strategy === "injected") {
    const provider = new InjectedSolanaStrategy();
    await provider.load();
    return provider;
  } else {
    throw new Error("Invalid provider type.");
  }
}
