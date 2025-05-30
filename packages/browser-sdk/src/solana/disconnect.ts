import { getProvider } from "./getProvider";
import { triggerEvent } from "./eventListeners";

export async function disconnect() {
  const provider = getProvider();
  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  await provider.disconnect();
  triggerEvent("disconnect");
}
