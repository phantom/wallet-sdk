import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

/**
 * Signs and sends a transaction using the Phantom provider.
 * @param transaction The transaction to sign and send.
 * @param options Options for sending the transaction and other operations.
 * @returns A promise that resolves with the transaction signature and optionally the public key.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAndSendTransaction(
  transaction: Transaction | VersionedTransaction,
  // The SendOptions are specific to this function, so they are separate from SolanaOperationOptions
  operationOptions?: SolanaOperationOptions,
): Promise<{ signature: string; publicKey?: string }> {
  const getProviderFn = operationOptions?.getProvider || defaultGetProvider;
  const provider = getProviderFn() as PhantomSolanaProvider | null;

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }
  if (!provider.signAndSendTransaction) {
    throw new Error("The connected provider does not support signAndSendTransaction.");
  }
  if (!provider.isConnected) {
    throw new Error("Provider is not connected.");
  }
  return provider.signAndSendTransaction(transaction);
}
