import { usePhantom } from "../PhantomProvider";

/**
 * Hook for Ethereum chain operations in React Native
 *
 * @returns Ethereum chain interface with connection enforcement
 */
export function useEthereum() {
  const { sdk, isConnected } = usePhantom();

  return {
    // Chain instance with connection enforcement for signing methods
    ethereum: sdk.ethereum,
    // State
    isAvailable: !!isConnected,
  };
}
