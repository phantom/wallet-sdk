import { getProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaSignInData } from "./types";
import type { PublicKey } from "@solana/web3.js";

/**
 * Signs in with Solana using the Phantom provider.
 * @param signInData The sign-in data.
 * @returns A promise that resolves with the address, signature, and signed message.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signIn(
  signInData: SolanaSignInData,
): Promise<{ address: PublicKey; signature: Uint8Array; signedMessage: Uint8Array }> {
  const provider = getProvider() as PhantomSolanaProvider | null;

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }
  if (!provider.signIn) {
    throw new Error("The connected provider does not support signIn.");
  }
  // No isConnected check typically needed for signIn, as it might establish connection
  return provider.signIn(signInData);
}
