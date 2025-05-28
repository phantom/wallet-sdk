import { getProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { connect } from "./connect";

/**
 * Signs a transaction using the Phantom provider without sending it.
 * @param transaction The transaction to sign.
 * @returns A promise that resolves with the signed transaction.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signTransaction(
  transaction: Transaction | VersionedTransaction,
): Promise<Transaction | VersionedTransaction> {
  const provider = getProvider() as PhantomSolanaProvider | null;

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  if (!provider.isConnected) {
    await connect();
  }

  if (!provider.signTransaction) {
    throw new Error("The connected provider does not support signTransaction.");
  }

  if (!provider.isConnected) {
    throw new Error("Provider is not connected even after attempting to connect.");
  }
  return provider.signTransaction(transaction);
}
