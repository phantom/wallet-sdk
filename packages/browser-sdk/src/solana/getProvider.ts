import { InjectedSolanaAdapter } from "./adapters/injected";
import type { SolanaAdapter } from "./adapters/types";

type ProviderType = "injected" | "kms" | "deeplink";

/**
 * Retrieves Phantom injected provider and returns it if it exists.
 * @returns Phantom injected provider or null if it doesn't exist.
 */
export function getProvider(type: ProviderType = "injected"): SolanaAdapter {
  return new InjectedSolanaAdapter();
  // TODO: add other providers here
  // if (type === "injected") {
  //   return ((window as any).phantom?.solana as NonNullable<PhantomSolanaProvider>) ?? null;
  // }

  // if (type === "kms") {
  //   return null;
  // }

  // if (type === "deeplink") {
  //   return null;
  // }
}
