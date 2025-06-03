import { getAdapter } from "./getAdapter";
import { triggerEvent } from "./eventListeners";

export async function disconnect() {
  const adapter = getAdapter();
  if (!adapter) {
    throw new Error("Phantom provider not found.");
  }

  await adapter.disconnect();
  triggerEvent("disconnect");
}
