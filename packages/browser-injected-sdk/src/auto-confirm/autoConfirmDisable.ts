import { getProvider } from "./getProvider";
import type { AutoConfirmResult } from "./types";

export async function autoConfirmDisable(): Promise<AutoConfirmResult> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  const result = await provider.request({
    method: "phantom_auto_confirm_disable",
    params: {},
  });

  return result;
}
