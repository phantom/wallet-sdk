import { getProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { connect } from "./connect";

/**
 * Signs and sends a transaction using the Phantom provider.
 * @param transaction The transaction to sign and send.
 * @returns A promise that resolves with the transaction signature and optionally the public key.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAndSendTransaction(
  transaction: Transaction | VersionedTransaction,
): Promise<{ signature: string; publicKey?: string }> {
  const provider = getProvider() as PhantomSolanaProvider | null;

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  if (!provider.isConnected) {
    await connect();
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
