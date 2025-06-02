import { getProvider } from "./getProvider";
import type { PhantomSolanaProvider, DisplayEncoding } from "./types";
import { connect } from "./connect";

/**
 * Signs a message using the Phantom provider.
 * @param message The message to sign (as a Uint8Array).
 * @param display The display encoding for the message (optional, defaults to utf8).
 * @returns A promise that resolves with the signature and public key.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signMessage(
  message: Uint8Array,
  display?: DisplayEncoding,
): Promise<{ signature: Uint8Array; publicKey: string }> {
  const provider = getProvider() as PhantomSolanaProvider | null;

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  if (!provider.isConnected) {
    await connect();
  }

  if (!provider.signMessage) {
    throw new Error("The connected provider does not support signMessage.");
  }

  if (!provider.isConnected) {
    throw new Error("Provider is not connected even after attempting to connect.");
  }
  const result = await provider.signMessage(message, display);
  return {
    signature: result.signature,
    publicKey: result.publicKey.toString(),
  };
}
