import { getProvider } from "./getProvider";
import { triggerEvent } from "./eventListeners";

export async function disconnect() {
  const provider = await getProvider();
  if (!provider) {
    throw new Error("Provider not found.");
  }

  await provider.disconnect();
  triggerEvent("disconnect");
}
