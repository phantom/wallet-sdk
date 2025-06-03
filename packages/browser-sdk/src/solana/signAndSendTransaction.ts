import type { Transaction } from "@solana/kit";
import { getAccount } from "./getAccount";
import { getProvider } from "./getProvider";

/**
 * Signs and sends a transaction using the Phantom provider.
 * @param transaction The transaction to sign and send.
 * @returns A promise that resolves with the transaction signature and optionally the public key.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signAndSendTransaction(
  transaction: Transaction,
): Promise<{ signature: string; address?: string }> {
  const provider = getProvider();

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  const account = await getAccount();

  if (!account) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signAndSendTransaction(transaction);
}
