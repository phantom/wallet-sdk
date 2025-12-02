import { usePhantom } from "../PhantomContext";
import type { IEthereumChain } from "@phantom/chain-interfaces";
import { AddressType } from "@phantom/browser-sdk";

/**
 * Hook for Ethereum chain operations
 *
 * @returns Ethereum chain interface with connection enforcement
 */
export function useEthereum(): {
  ethereum: IEthereumChain;
  isAvailable: boolean;
} {
  const { sdk, isClient, isLoading } = usePhantom();

  if (!isClient || !sdk || isLoading) {
    // Return a stub object for SSR, while SDK is initializing, or while discovery is in progress
    // We still return the chain object, but isAvailable will be false
    return {
      ethereum: {} as IEthereumChain,
      isAvailable: false,
    };
  }

  const enabledAddressTypes = sdk.getEnabledAddressTypes();
  const isAvailable = enabledAddressTypes.includes(AddressType.ethereum);

  // Only access sdk.ethereum if it's available, otherwise return a stub
  // This prevents errors when the selected wallet doesn't support Ethereum
  if (!isAvailable) {
    return {
      ethereum: {} as IEthereumChain,
      isAvailable: false,
    };
  }

  try {
    return {
      ethereum: sdk.ethereum,
      isAvailable: true,
    };
  } catch (error) {
    // If accessing sdk.ethereum throws (e.g., wallet doesn't support Ethereum),
    // return a stub object instead of crashing
    // Ethereum chain not available
    return {
      ethereum: {} as IEthereumChain,
      isAvailable: false,
    };
  }
}
