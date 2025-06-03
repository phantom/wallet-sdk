import type { Transaction } from "@solana/kit";
import { getAdapter } from "./getAdapter";

/**
 * Signs and sends a transaction using the Phantom provider.
 * @param transaction The transaction to sign and send.
 * @returns A promise that resolves with the transaction signature and optionally the public key.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAndSendTransaction(
  transaction: Transaction,
): Promise<{ signature: string; address?: string }> {
  const adapter = getAdapter();

  if (!adapter) {
    throw new Error("Adapter not found.");
  }

  if (!adapter.isConnected) {
    await adapter.connect({ onlyIfTrusted: false });
  }

  return adapter.signAndSendTransaction(transaction);
}
