import type { Transaction } from "@solana/kit";
import { getProvider } from "./getProvider";

/**
 * Signs all transactions using the Phantom provider.
 * @param transactions An array of transactions to sign.
 * @returns A promise that resolves with an array of signed transactions.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
  const provider = await getProvider();
  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signAllTransactions(transactions);
}
