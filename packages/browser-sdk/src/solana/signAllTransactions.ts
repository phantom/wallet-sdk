import type { Transaction } from "@solana/kit";
import { getAdapter } from "./getAdapter";

/**
 * Signs all transactions using the Phantom provider.
 * @param transactions An array of transactions to sign.
 * @returns A promise that resolves with an array of signed transactions.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
  const adapter = getAdapter();
  if (!adapter) {
    throw new Error("Adapter not found.");
  }

  if (!adapter.isConnected) {
    await adapter.connect({ onlyIfTrusted: false });
  }

  return adapter.signAllTransactions(transactions);
}
