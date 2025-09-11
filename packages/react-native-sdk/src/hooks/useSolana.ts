import { usePhantom } from "../PhantomProvider";

/**
 * Hook for Solana chain operations in React Native
 *
 * @returns Solana chain interface with connection enforcement
 */
export function useSolana() {
  const { sdk, isConnected } = usePhantom();

  return {
    // Chain instance with connection enforcement for signing methods
    solana: sdk.solana,
    // State
    isAvailable: !!isConnected,
  };
}
