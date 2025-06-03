import { getAdapter } from "./getAdapter";
import { triggerEvent } from "./eventListeners";

export async function connect() {
  const adapter = getAdapter();
  if (!adapter) {
    throw new Error("Phantom provider not found.");
  }

  if (adapter.isConnected) {
    return adapter.getAccount();
  }

  // first try eager connecting without prompting user
  try {
    const address = await adapter.connect({ onlyIfTrusted: true });
    if (address) {
      triggerEvent("connect", address);
      return address;
    }
  } catch (error) {
    // Silently fail eager connect attempt
  }

  // if not connected, prompt user to connect prominently
  try {
    const address = await adapter.connect({ onlyIfTrusted: false });

    if (address) {
      triggerEvent("connect", address);
      return address;
    }
  } catch (error) {
    // Silently fail eager connect attempt
  }

  throw new Error("Failed to connect to Phantom.");
}
