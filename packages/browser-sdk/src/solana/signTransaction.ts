import type { Transaction } from "@solana/kit";
import { getAccount } from "./getAccount";
import { getProvider } from "./getProvider";
/**
 * Signs a transaction using the Phantom provider without sending it.
 * @param transaction The transaction to sign.
 * @returns A promise that resolves with the signed transaction.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signTransaction(transaction: Transaction): Promise<Transaction> {
  const provider = getProvider();

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  const account = await getAccount();

  if (!account) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signTransaction(transaction);
}
