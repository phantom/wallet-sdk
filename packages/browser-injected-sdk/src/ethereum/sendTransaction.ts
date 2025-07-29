import { getProvider } from "./getProvider";
import type { EthereumTransaction } from "./types";

/**
 * Sends a transaction using the Phantom Ethereum provider.
 * @param transaction The transaction to send.
 * @returns A promise that resolves with the transaction hash.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function sendTransaction(transaction: EthereumTransaction): Promise<string> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.sendTransaction(transaction);
}

/**
 * Signs a transaction using the Phantom Ethereum provider.
 * @param transaction The transaction to sign.
 * @returns A promise that resolves with the signed transaction.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signTransaction(transaction: EthereumTransaction): Promise<string> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signTransaction(transaction);
}
