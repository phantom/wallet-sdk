import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { connect } from "./connect";

/**
 * Signs a transaction using the Phantom provider without sending it.
 * @param transaction The transaction to sign.
 * @param options Optional parameters, including a custom getProvider function.
 * @returns A promise that resolves with the signed transaction.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signTransaction(
  transaction: Transaction | VersionedTransaction,
  options?: SolanaOperationOptions,
): Promise<Transaction | VersionedTransaction> {
  const getProviderFn = options?.getProvider || defaultGetProvider;
  const provider = getProviderFn() as PhantomSolanaProvider | null;

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  if (!provider.isConnected) {
    await connect({ getProvider: getProviderFn });
  }

  if (!provider.signTransaction) {
    throw new Error("The connected provider does not support signTransaction.");
  }

  if (!provider.isConnected) {
    throw new Error("Provider is not connected even after attempting to connect.");
  }
  return provider.signTransaction(transaction);
}
