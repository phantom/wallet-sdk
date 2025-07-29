import { getProvider } from "./getProvider";

/**
 * Signs a message using the Phantom Ethereum provider.
 * @param message The message to sign (as a string).
 * @param address The address to sign with.
 * @returns A promise that resolves with the signature.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signMessage(message: string, address: string): Promise<string> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signMessage(message, address);
}

/**
 * Signs a personal message using the Phantom Ethereum provider.
 * @param message The message to sign (as a string).
 * @param address The address to sign with.
 * @returns A promise that resolves with the signature.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signPersonalMessage(message: string, address: string): Promise<string> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signPersonalMessage(message, address);
}

/**
 * Signs typed data using the Phantom Ethereum provider.
 * @param typedData The typed data to sign.
 * @param address The address to sign with.
 * @returns A promise that resolves with the signature.
 * @throws Error if Phantom provider is not found or if the operation fails.
 */
export async function signTypedData(typedData: any, address: string): Promise<string> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (!provider.isConnected) {
    await provider.connect({ onlyIfTrusted: false });
  }

  return provider.signTypedData(typedData, address);
}
