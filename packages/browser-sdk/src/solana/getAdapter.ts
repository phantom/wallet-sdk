import { InjectedSolanaAdapter } from "./adapters/injected";
import type { SolanaAdapter } from "./adapters/types";

type AdapterType = "injected" | "kms" | "deeplink";

/**
 * Retrieves Phantom injected provider and returns it if it exists.
 * @returns Phantom injected provider or null if it doesn't exist.
 */
export async function getAdapter(_type: AdapterType = "injected"): Promise<SolanaAdapter> {
  const adapter = new InjectedSolanaAdapter();
  try {
    await adapter.load();

    return adapter;
  } catch (error) {
    throw new Error("Phantom provider not found.");
  }

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
