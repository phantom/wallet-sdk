import { getProvider } from "./getProvider";
import type { AutoConfirmResult } from "./types";
import { internalCaipToNetworkId } from "@phantom/constants";

export async function autoConfirmStatus(): Promise<AutoConfirmResult> {
  const provider = getProvider();

  const result = await provider.request({
    method: "phantom_auto_confirm_status",
    params: {},
  });

  // Transform InternalNetworkCaip back to NetworkId for public interface
  return {
    ...result,
    chains: result.chains.map(internalCaipToNetworkId),
  };
}
