import { usePhantom } from "../PhantomContext";
import type { ISolanaChain } from "@phantom/chain-interfaces";
import { AddressType } from "@phantom/browser-sdk";

/**
 * Hook for Solana chain operations
 *
 * @returns Solana chain interface with connection enforcement
 */
export function useSolana(): {
  solana: ISolanaChain;
  isAvailable: boolean;
} {
  const { sdk, isClient, isLoading } = usePhantom();

  if (!isClient || !sdk || isLoading) {
    // Return a stub object for SSR, while SDK is initializing, or while discovery is in progress
    // We still return the chain object, but isAvailable will be false
    return {
      solana: {} as ISolanaChain,
      isAvailable: false,
    };
  }

  const enabledAddressTypes = sdk.getEnabledAddressTypes();
  const isAvailable = enabledAddressTypes.includes(AddressType.solana);

  // Only access sdk.solana if it's available, otherwise return a stub
  // This prevents errors when the selected wallet doesn't support Solana
  if (!isAvailable) {
    return {
      solana: {} as ISolanaChain,
      isAvailable: false,
    };
  }

  try {
    return {
      solana: sdk.solana,
      isAvailable: true,
    };
  } catch (error) {
    // If accessing sdk.solana throws (e.g., wallet doesn't support Solana),
    // return a stub object instead of crashing
    // Solana chain not available
    return {
      solana: {} as ISolanaChain,
      isAvailable: false,
    };
  }
}
