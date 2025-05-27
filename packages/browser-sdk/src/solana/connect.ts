import { getProvider as defaultGetProvider } from "./getProvider";
import type { SolanaOperationOptions } from "./types";

export async function connect(operationOptions?: SolanaOperationOptions) {
  const getProviderFn = operationOptions?.getProvider || defaultGetProvider;
  const provider = getProviderFn();
  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  if (provider.isConnected) {
    return provider.publicKey?.toString();
  }

  // first try eager connecting without prompting user
  try {
    const eagerConnectResult = await provider.connect({ onlyIfTrusted: true });
    if (eagerConnectResult.publicKey) {
      return eagerConnectResult.publicKey.toString();
    }
  } catch (error) {
    // Silently fail eager connect attempt
  }

  // if not connected, prompt user to connect prominently
  try {
    const connectResult = await provider.connect({ onlyIfTrusted: false });

    if (connectResult.publicKey) {
      return connectResult.publicKey.toString();
    }
  } catch (error) {
    // Silently fail eager connect attempt
  }

  throw new Error("Failed to connect to Phantom.");
}
