import { getProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { connect } from "./connect";

/**
 * Signs all transactions using the Phantom provider.
 * @param transactions An array of transactions to sign.
 * @returns A promise that resolves with an array of signed transactions.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAllTransactions(
  transactions: (Transaction | VersionedTransaction)[],
): Promise<(Transaction | VersionedTransaction)[]> {
  const provider = getProvider() as PhantomSolanaProvider | null;

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  if (!provider.isConnected) {
    await connect();
  }

  if (!provider.signAllTransactions) {
    throw new Error("The connected provider does not support signAllTransactions.");
  }

  if (!provider.isConnected) {
    throw new Error("Provider is not connected even after attempting to connect.");
  }
  return provider.signAllTransactions(transactions);
}
