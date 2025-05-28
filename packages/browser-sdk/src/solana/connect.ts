import { getProvider } from "./getProvider";
import { triggerConnectCallbacks } from "./onConnect";

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
      const publicKeyStr = eagerConnectResult.publicKey.toString();
      triggerConnectCallbacks(publicKeyStr);
      return publicKeyStr;
    }
  } catch (error) {
    // Silently fail eager connect attempt
  }

  // if not connected, prompt user to connect prominently
  try {
    const connectResult = await provider.connect({ onlyIfTrusted: false });

    if (connectResult.publicKey) {
      const publicKeyStr = connectResult.publicKey.toString();
      triggerConnectCallbacks(publicKeyStr);
      return publicKeyStr;
    }
  } catch (error) {
    // Silently fail eager connect attempt
  }

  throw new Error("Failed to connect to Phantom.");
}
