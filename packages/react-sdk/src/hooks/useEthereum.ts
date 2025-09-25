import { usePhantom } from "../PhantomProvider";
import type { IEthereumChain } from "@phantom/chain-interfaces";

/**
 * Hook for Ethereum chain operations
 *
 * @returns Ethereum chain interface with connection enforcement
 */
export function useEthereum(): {
  ethereum: IEthereumChain;
  isAvailable: boolean;
} {
  const { sdk, isConnected, isClient } = usePhantom();

  if (!isClient || !sdk) {
    // Return a stub object for SSR or while SDK is initializing
    return {
      ethereum: {} as IEthereumChain, // This will be replaced when SDK is ready
      isAvailable: false,
    };
  }

  return {
    // Chain instance with connection enforcement for signing methods
    ethereum: sdk.ethereum,
    // State
    isAvailable: !!isConnected,
  };
}
