import { useCallback, useMemo } from "react";
import { usePhantom } from "../PhantomProvider";
import type { ISolanaChain } from "@phantom/chains";

/**
 * Hook for Solana chain operations
 *
 * @returns Solana chain interface and convenient methods
 */
export function useSolana() {
  const { sdk, isConnected } = usePhantom();

  // Helper to get current chain state - no memoization to avoid race conditions
  const getSolanaChain = useCallback((): ISolanaChain => {
    if (!sdk) throw new Error("Phantom SDK not initialized.");
    if (!sdk.isConnected()) throw new Error("Phantom SDK not connected. Call connect() first.");
    return sdk.solana;
  }, [sdk]);

  // Memoize the chain only for read-only access - methods use real-time access
  const solanaChain = useMemo<ISolanaChain | null>(() => {
    if (!sdk || !isConnected) return null;
    try {
      return sdk.solana;
    } catch {
      return null;
    }
  }, [sdk, isConnected]);

  const signMessage = useCallback(
    async (message: string | Uint8Array) => {
      const chain = getSolanaChain();
      return chain.signMessage(message);
    },
    [getSolanaChain],
  );

  const signTransaction = useCallback(
    async <T>(transaction: T): Promise<T> => {
      const chain = getSolanaChain();
      return chain.signTransaction(transaction);
    },
    [getSolanaChain],
  );

  const signAndSendTransaction = useCallback(
    async <T>(transaction: T) => {
      const chain = getSolanaChain();
      return chain.signAndSendTransaction(transaction);
    },
    [getSolanaChain],
  );

  const connect = useCallback(
    async (options?: { onlyIfTrusted?: boolean }) => {
      const chain = getSolanaChain();
      return chain.connect(options);
    },
    [getSolanaChain],
  );

  const disconnect = useCallback(async () => {
    const chain = getSolanaChain();
    return chain.disconnect();
  }, [getSolanaChain]);

  const switchNetwork = useCallback(
    async (network: "mainnet" | "devnet") => {
      const chain = getSolanaChain();
      return chain.switchNetwork?.(network);
    },
    [getSolanaChain],
  );

  const getPublicKey = useCallback(async () => {
    if (!sdk || !sdk.isConnected()) return null;
    return sdk.solana.getPublicKey();
  }, [sdk]);

  return {
    // Chain instance for advanced usage
    solana: solanaChain,

    // Convenient methods
    signMessage,
    signTransaction,
    signAndSendTransaction,
    connect,
    disconnect,
    switchNetwork,
    getPublicKey,

    // State
    isAvailable: !!solanaChain,
    isConnected: solanaChain?.isConnected() ?? false,
  };
}
