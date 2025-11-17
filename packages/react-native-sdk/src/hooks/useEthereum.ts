import { usePhantom } from "../PhantomContext";
import type { IEthereumChain } from "@phantom/chain-interfaces";

/**
 * Hook for Ethereum chain operations in React Native
 *
 * @returns Ethereum chain interface with connection enforcement
 */
export function useEthereum(): {
  ethereum: IEthereumChain;
  isAvailable: boolean;
} {
  const { sdk, isConnected } = usePhantom();

  return {
    // Chain instance with connection enforcement for signing methods
    ethereum: sdk.ethereum,
    // State
    isAvailable: !!isConnected,
  };
}
