import { getProvider } from "./getProvider";
import { triggerDisconnectCallbacks } from "./onDisconnect";

export async function disconnect() {
  const provider = getProvider();
  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  await provider.disconnect();
  triggerDisconnectCallbacks();
}
