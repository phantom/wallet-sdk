import { getProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";
import type { Transaction } from "@solana/kit";
import type { VersionedTransaction } from "@solana/web3.js";
import { connect } from "./connect";
import { transactionToVersionedTransaction } from "./utils/transactionToVersionedTransaction";
import { fromVersionedTransaction } from "@solana/compat";

/**
 * Signs all transactions using the Phantom provider.
 * @param transactions An array of transactions to sign.
 * @returns A promise that resolves with an array of signed transactions.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
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

  // Convert each Kit transaction into a VersionedTransaction understood by the provider.
  const versionedTransactions = transactions.map(transactionToVersionedTransaction);

  const signedVersionedTransactions = (await provider.signAllTransactions(
    versionedTransactions,
  )) as VersionedTransaction[];

  // Convert the signed web3.js transactions back into Kit transactions before returning.
  const signedTransactions = signedVersionedTransactions.map(vt => {
    const tx = fromVersionedTransaction(vt);
    return tx as unknown as Transaction;
  });

  return signedTransactions;
}
