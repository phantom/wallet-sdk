import { usePhantom } from "../PhantomProvider";
import type { ISolanaChain } from "@phantom/chain-interfaces";

/**
 * Hook for Solana chain operations
 *
 * @returns Solana chain interface with connection enforcement
 */
export function useSolana(): {
  solana: ISolanaChain;
  isAvailable: boolean;
} {
  const { sdk, isConnected, isClient } = usePhantom();

  if (!isClient || !sdk) {
    // Return a stub object for SSR or while SDK is initializing
    return {
      solana: {} as ISolanaChain, // This will be replaced when SDK is ready
      isAvailable: false,
    };
  }

  return {
    // Chain instance with connection enforcement for signing methods
    solana: sdk.solana,
    // State
    isAvailable: !!isConnected,
  };
}
