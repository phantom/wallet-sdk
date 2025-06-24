import { getProvider } from "./getProvider";
import type { AutoConfirmEnableParams, AutoConfirmResult } from "./types";

export async function autoConfirmEnable(params?: AutoConfirmEnableParams): Promise<AutoConfirmResult> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  const result = await provider.request({
    method: "phantom_auto_confirm_enable",
    params: params || {},
  });

  return result;
}
