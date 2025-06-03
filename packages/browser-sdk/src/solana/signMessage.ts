import { getAdapter } from "./getAdapter";
import type { DisplayEncoding } from "./types";

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
): Promise<{ signature: Uint8Array; address: string }> {
  const adapter = getAdapter();

  if (!adapter) {
    throw new Error("Adapter not found.");
  }

  if (!adapter.isConnected) {
    await adapter.connect({ onlyIfTrusted: false });
  }

  return adapter.signMessage(message, display);
}
