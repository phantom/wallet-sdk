import { getProvider } from "./getProvider";

/**
 * Gets the current chain ID.
 * @returns A promise that resolves with the chain ID.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function getChainId(): Promise<string> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  return provider.getChainId();
}

/**
 * Switches to a different chain.
 * @param chainId The chain ID to switch to.
 * @returns A promise that resolves when the switch is complete.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function switchChain(chainId: string): Promise<void> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  return provider.switchChain(chainId);
}
