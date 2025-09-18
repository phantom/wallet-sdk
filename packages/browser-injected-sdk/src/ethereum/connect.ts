import { getProvider } from "./getProvider";
import { triggerEvent } from "./eventListeners";

export async function connect({ onlyIfTrusted = false } = {}): Promise<string[]> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  if (provider.isConnected) {
    const accounts = await provider.getAccounts();
    return accounts;
  }

  // first try eager connecting without prompting user
  try {
    const accounts = await provider.connect({ onlyIfTrusted: true });
    if (accounts && accounts.length > 0) {
      triggerEvent("connect", accounts);
      return accounts;
    }
  } catch (error) {
    // Silently fail eager connect attempt
  }

  if (onlyIfTrusted) {
    throw new Error("No trusted connection available.");
  }

  // if not connected, prompt user to connect prominently
  try {
    const accounts = await provider.connect({ onlyIfTrusted: false });

    if (accounts && accounts.length > 0) {
      triggerEvent("connect", accounts);
      return accounts;
    }
  } catch (error) {
    // Silently fail connect attempt
  }

  throw new Error("Failed to connect to Phantom.");
}
