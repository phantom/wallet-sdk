import { useMemo } from "react";
import { usePhantom } from "../PhantomProvider";
import { wrapChainWithConnectionEnforcement, SOLANA_SIGNING_METHODS } from "../utils/chainWrappers";

/**
 * Hook for Solana chain operations
 *
 * @returns Solana chain interface with connection enforcement
 */
export function useSolana() {
  const { sdk, isConnected } = usePhantom();

  const solana = useMemo(() => {
    if (!isConnected) return null;
    try {
      const chain = sdk.solana;
      return wrapChainWithConnectionEnforcement(
        chain, 
        () => sdk, 
        SOLANA_SIGNING_METHODS
      );
    } catch {
      return null;
    }
  }, [sdk, isConnected]);

  return {
    // Chain instance with connection enforcement for signing methods
    solana,
    // State
    isAvailable: !!solana,
  };
}
