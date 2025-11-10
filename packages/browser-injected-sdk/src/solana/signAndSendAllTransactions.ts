import { getProvider } from "./getProvider";
import { type VersionedTransaction, type Transaction } from "@phantom/sdk-types";

/**
 * Signs and sends all transactions using the Phantom provider.
 * @param transactions An array of transactions to sign and send (Web3.js format).
 * @returns A promise that resolves with an array of transaction signatures and optionally the public key.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAndSendAllTransactions(
  transactions: (VersionedTransaction | Transaction)[],
): Promise<{ signatures: string[]; address?: string }> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signAndSendAllTransactions(transactions);
}
