import { getProvider } from "./getProvider";
import { triggerEvent } from "./eventListeners";

export async function connect() {
  const provider = getProvider();
  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  // first try eager connecting without prompting user
  try {
    const address = await provider.connect({ onlyIfTrusted: true });
    if (address) {
      triggerEvent("connect", address);
      return address;
    }
  } catch (error) {
    // Silently fail eager connect attempt
  }

  // if not connected, prompt user to connect prominently
  try {
    const address = await provider.connect({ onlyIfTrusted: false });

    if (address) {
      triggerEvent("connect", address);
      return address;
    }
  } catch (error) {
    // Silently fail eager connect attempt
  }

  throw new Error("Failed to connect to Phantom.");
}
