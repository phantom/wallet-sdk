import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, DisplayEncoding, SolanaOperationOptions } from "./types";
import type { PublicKey } from "@solana/web3.js";

/**
 * Signs a message using the Phantom provider.
 * @param message The message to sign (as a Uint8Array).
 * @param display The display encoding for the message (optional, defaults to utf8).
 * @param options Optional parameters, including a custom getProvider function.
 * @returns A promise that resolves with the signature and public key.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signMessage(
  message: Uint8Array,
  display?: DisplayEncoding,
  options?: SolanaOperationOptions,
): Promise<{ signature: Uint8Array; publicKey: PublicKey }> {
  const getProviderFn = options?.getProvider || defaultGetProvider;
  const provider = getProviderFn() as PhantomSolanaProvider | null;

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }
  if (!provider.signMessage) {
    throw new Error("The connected provider does not support signMessage.");
  }
  if (!provider.isConnected) {
    throw new Error("Provider is not connected.");
  }
  return provider.signMessage(message, display);
}
