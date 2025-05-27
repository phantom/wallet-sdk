import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { connect } from "./connect";

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

  if (!provider.isConnected) {
    // Attempt to connect if not already connected.
    // Pass the getProviderFn to ensure connect uses the same provider resolution.
    await connect({ getProvider: getProviderFn });
    // After attempting to connect, re-check isConnected.
    // The connect function itself would throw if connection failed or provider still not found.
    // If connect() succeeded, provider.isConnected should be true, or connect() would have thrown.
    // However, it's good practice to ensure the provider object is still valid and connected if connect itself doesn't throw.
    // The current connect function doesn't re-assign provider in this scope, it works on the instance obtained by getProviderFn.
    // If connect fails, it throws, so execution won't proceed.
  }

  if (!provider.signAndSendTransaction) {
    throw new Error("The connected provider does not support signAndSendTransaction.");
  }
  // Re-check isConnected after the connect call, as a safeguard,
  // although connect() should throw if it fails to establish a connection.
  if (!provider.isConnected) {
    throw new Error("Provider is not connected even after attempting to connect.");
  }
  return provider.signAndSendTransaction(transaction);
}
