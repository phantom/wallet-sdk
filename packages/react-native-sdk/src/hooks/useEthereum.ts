import { useMemo } from "react";
import { usePhantom } from "../PhantomProvider";
import { wrapChainWithConnectionEnforcement, ETHEREUM_SIGNING_METHODS } from "../utils/chainWrappers";

/**
 * Hook for Ethereum chain operations in React Native
 *
 * @returns Ethereum chain interface with connection enforcement
 */
export function useEthereum() {
  const { sdk, isConnected } = usePhantom();

  const ethereum = useMemo(() => {
    if (!isConnected) return null;
    try {
      const chain = sdk.ethereum;
      return wrapChainWithConnectionEnforcement(
        chain, 
        () => sdk, 
        ETHEREUM_SIGNING_METHODS
      );
    } catch {
      return null;
    }
  }, [sdk, isConnected]);

  return {
    // Chain instance with connection enforcement for signing methods
    ethereum,
    // State
    isAvailable: !!ethereum,
  };
}
