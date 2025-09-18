import { usePhantom } from "../PhantomProvider";

/**
 * Hook for Solana chain operations
 *
 * @returns Solana chain interface with connection enforcement
 */
export function useSolana() {
  const { sdk, isConnected, isClient } = usePhantom();

  if (!isClient || !sdk) {
    // Return a stub object for SSR or while SDK is initializing
    return {
      solana: {} as any, // This will be replaced when SDK is ready
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
