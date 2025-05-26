import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

/**
 * Signs all transactions using the Phantom provider.
 * @param transactions An array of transactions to sign.
 * @param options Optional parameters, including a custom getProvider function.
 * @returns A promise that resolves with an array of signed transactions.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAllTransactions(
  transactions: (Transaction | VersionedTransaction)[],
  options?: SolanaOperationOptions,
): Promise<(Transaction | VersionedTransaction)[]> {
  const getProviderFn = options?.getProvider || defaultGetProvider;
  const provider = getProviderFn() as PhantomSolanaProvider | null;

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }
  if (!provider.signAllTransactions) {
    throw new Error("The connected provider does not support signAllTransactions.");
  }
  if (!provider.isConnected) {
    throw new Error("Provider is not connected.");
  }
  return provider.signAllTransactions(transactions);
}
