import { getProvider } from "./getProvider";
import { type VersionedTransaction, type Transaction } from "@phantom/sdk-types";

/**
 * Signs and sends a transaction using the Phantom provider.
 * @param transaction The transaction to sign and send (Web3.js format).
 * @returns A promise that resolves with the transaction signature and optionally the public key.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAndSendTransaction(
  transaction: VersionedTransaction | Transaction,
): Promise<{ signature: string; address?: string }> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signAndSendTransaction(transaction);
}
