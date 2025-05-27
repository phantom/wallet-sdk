import { getProvider } from "./getProvider";

export async function connect() {
  const provider = getProvider();
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
  const connectResult = await provider.connect({ onlyIfTrusted: false });
  if (connectResult.publicKey) {
    return connectResult.publicKey.toString();
  }

  throw new Error("Failed to connect to Phantom.");
}
