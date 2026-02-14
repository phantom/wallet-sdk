/**
 * Solana utility functions
 */

import { AddressType } from "@phantom/client";
import type { ToolContext } from "../tools/types.js";

/**
 * Retrieves the Solana address for a given wallet
 * @param context - Tool context containing the client
 * @param walletId - The wallet ID to fetch the address for
 * @param derivationIndex - Optional derivation index for the account
 * @returns The Solana address as a string
 * @throws Error if no Solana address is found for the wallet
 */
export async function getSolanaAddress(
  context: ToolContext,
  walletId: string,
  derivationIndex?: number,
): Promise<string> {
  const addresses = await context.client.getWalletAddresses(walletId, undefined, derivationIndex);
  const solanaAddress =
    addresses.find(addr => addr.addressType === AddressType.solana) ||
    addresses.find(addr => addr.addressType.toLowerCase() === "solana");

  if (!solanaAddress) {
    throw new Error("No Solana address found for this wallet");
  }

  return solanaAddress.address;
}
