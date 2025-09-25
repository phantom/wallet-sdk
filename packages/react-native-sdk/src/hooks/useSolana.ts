import { usePhantom } from "../PhantomProvider";
import type { ISolanaChain } from "@phantom/chain-interfaces";

/**
 * Hook for Solana chain operations in React Native
 *
 * @returns Solana chain interface with connection enforcement
 */
export function useSolana(): {
  solana: ISolanaChain;
  isAvailable: boolean;
} {
  const { sdk, isConnected } = usePhantom();

  return {
    // Chain instance with connection enforcement for signing methods
    solana: sdk.solana,
    // State
    isAvailable: !!isConnected,
  };
}
