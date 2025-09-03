import { getProvider } from "./getProvider";
import type { AutoConfirmEnableParams, AutoConfirmResult } from "./types";
import { networkIdToInternalCaip, internalCaipToNetworkId } from "@phantom/constants";

export async function autoConfirmEnable(params?: AutoConfirmEnableParams): Promise<AutoConfirmResult> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  // Transform NetworkId to InternalNetworkCaip for extension communication
  const transformedParams = params?.chains ? { chains: params.chains.map(networkIdToInternalCaip) } : {};

  const result = await provider.request({
    method: "phantom_auto_confirm_enable",
    params: transformedParams,
  });

  // Transform InternalNetworkCaip back to NetworkId for public interface
  return {
    ...result,
    chains: result.chains.map(internalCaipToNetworkId),
  };
}
