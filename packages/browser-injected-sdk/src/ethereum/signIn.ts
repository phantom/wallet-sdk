import { getProvider } from "./getProvider";
import type { EthereumSignInData } from "./types";

/**
 * Signs in using the Phantom Ethereum provider.
 * @param signInData The sign-in data.
 * @returns A promise that resolves with the signature data.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signIn(
  signInData: EthereumSignInData,
): Promise<{ address: string; signature: string; signedMessage: string }> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signIn(signInData);
}
