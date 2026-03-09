import { getProvider } from "./getProvider";
import { triggerEvent } from "./eventListeners";

export async function disconnect(): Promise<void> {
  const provider = await getProvider();

  await provider.disconnect();
  triggerEvent("disconnect", []);
}
