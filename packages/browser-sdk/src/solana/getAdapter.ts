import { InjectedSolanaAdapter } from "./adapters/injected";
import { KmsSolanaAdapter } from "./adapters/kms";
import { DeepLinkSolanaAdapter } from "./adapters/deeplinks";
import type { SolanaAdapter } from "./adapters/types";

type AdapterType = "injected" | "kms" | "deeplink";

/**
 * Retrieves Phantom injected provider and returns it if it exists.
 * @returns Phantom injected provider or null if it doesn't exist.
 */
export async function getAdapter(type: AdapterType = "injected"): Promise<SolanaAdapter> {
  if (type === "injected") {
    const adapter = new InjectedSolanaAdapter();
    try {
      await adapter.load();

      return adapter;
    } catch (error) {
      throw new Error("Phantom provider not found.");
    }
  } else if (type === "kms") {
    return new KmsSolanaAdapter();
  } else if (type === "deeplink") {
    return new DeepLinkSolanaAdapter();
  } else {
    throw new Error("Invalid adapter type.");
  }
}
