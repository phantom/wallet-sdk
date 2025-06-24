import { getProvider } from "./getProvider";
import type { AutoConfirmSupportedChainsResult } from "./types";

export async function autoConfirmSupportedChains(): Promise<AutoConfirmSupportedChainsResult> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  const result = await provider.request({
    method: "phantom_auto_confirm_supported_chains",
    params: {},
  });

  return result;
}