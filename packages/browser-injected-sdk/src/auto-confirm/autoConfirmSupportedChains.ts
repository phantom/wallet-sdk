import { getProvider } from "./getProvider";
import type { AutoConfirmSupportedChainsResult } from "./types";
import { internalCaipToNetworkId } from "@phantom/constants";

export async function autoConfirmSupportedChains(): Promise<AutoConfirmSupportedChainsResult> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  const result = await provider.request({
    method: "phantom_auto_confirm_supported_chains",
    params: {},
  });

  // Transform InternalNetworkCaip back to NetworkId for public interface
  return {
    chains: result.chains.map(internalCaipToNetworkId),
  };
}
