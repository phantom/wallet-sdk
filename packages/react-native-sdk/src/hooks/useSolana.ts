import { usePhantom } from "../PhantomContext";
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
    solana: sdk.solana,
    isAvailable: !!isConnected,
  };
}
