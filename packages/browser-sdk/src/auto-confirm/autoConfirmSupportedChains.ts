import { getProvider } from "./getProvider";
import type { AutoConfirmSupportedChainsResult } from "./types";

export async function autoConfirmSupportedChains(): Promise<AutoConfirmSupportedChainsResult> {
  const provider = getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  const result = await provider.request({
    method: "phantom_auto_confirm_supported_chains",
    params: {},
  });

  return result;
}
