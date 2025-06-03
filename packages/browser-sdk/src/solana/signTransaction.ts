import type { Transaction } from "@solana/kit";
import { getAdapter } from "./getAdapter";
/**
 * Signs a transaction using the Phantom provider without sending it.
 * @param transaction The transaction to sign.
 * @returns A promise that resolves with the signed transaction.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signTransaction(transaction: Transaction): Promise<Transaction> {
  const adapter = await getAdapter();

  if (!adapter) {
    throw new Error("Adapter not found.");
  }

  if (!adapter.isConnected) {
    await adapter.connect({ onlyIfTrusted: false });
  }

  return adapter.signTransaction(transaction);
}
