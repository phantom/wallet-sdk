import type { Transaction } from "@solana/kit";
import { fromVersionedTransaction } from "@solana/compat";
import { getProvider } from "./getProvider";
import { type VersionedTransaction } from "@solana/web3.js";

/**
 * Signs and sends a transaction using the Phantom provider.
 * @param transaction The transaction to sign and send.
 * @returns A promise that resolves with the transaction signature and optionally the public key.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAndSendTransaction(
  transaction: Transaction | VersionedTransaction,
): Promise<{ signature: string; address?: string }> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  let kitTransaction: Transaction;

  // convert web3.js transaction to @solana/kit Transaction if needed
  if ((transaction as any)?.messageBytes == null) {
    kitTransaction = fromVersionedTransaction(transaction as VersionedTransaction);
  } else {
    kitTransaction = transaction as Transaction;
  }

  return provider.signAndSendTransaction(kitTransaction);
}
