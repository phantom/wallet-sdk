import { getProvider } from "./getProvider";
import { triggerEvent } from "./eventListeners";

export async function disconnect() {
  const provider = await getProvider();

  await provider.disconnect();
  triggerEvent("disconnect");
}
