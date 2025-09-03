import { useCallback, useMemo } from "react";
import { usePhantom } from "../PhantomProvider";
import type { ISolanaChain } from "@phantom/chains";

/**
 * Hook for Solana chain operations in React Native
 *
 * @returns Solana chain interface and convenient methods
 */
export function useSolana() {
  const { sdk, isConnected } = usePhantom();

  const solanaChain = useMemo<ISolanaChain | null>(() => {
    if (!sdk || !isConnected) return null;
    try {
      return sdk.solana;
    } catch {
      return null; // SDK not connected yet
    }
  }, [sdk, isConnected]);

  const signMessage = useCallback(
    async (message: string | Uint8Array) => {
      if (!solanaChain) throw new Error("Solana chain not available. Ensure SDK is connected.");
      return await solanaChain.signMessage(message);
    },
    [solanaChain],
  );

  const signTransaction = useCallback(
    async <T>(transaction: T): Promise<T> => {
      if (!solanaChain) throw new Error("Solana chain not available. Ensure SDK is connected.");
      return await solanaChain.signTransaction(transaction);
    },
    [solanaChain],
  );

  const signAndSendTransaction = useCallback(
    async <T>(transaction: T) => {
      if (!solanaChain) throw new Error("Solana chain not available. Ensure SDK is connected.");
      return await solanaChain.signAndSendTransaction(transaction);
    },
    [solanaChain],
  );

  const connect = useCallback(
    async (options?: { onlyIfTrusted?: boolean }) => {
      if (!solanaChain) throw new Error("Solana chain not available. Ensure SDK is connected.");
      return await solanaChain.connect(options);
    },
    [solanaChain],
  );

  const disconnect = useCallback(async () => {
    if (!solanaChain) throw new Error("Solana chain not available. Ensure SDK is connected.");
    return await solanaChain.disconnect();
  }, [solanaChain]);

  const switchNetwork = useCallback(
    async (network: "mainnet" | "devnet") => {
      if (!solanaChain) throw new Error("Solana chain not available. Ensure SDK is connected.");
      return await solanaChain.switchNetwork?.(network);
    },
    [solanaChain],
  );

  const getPublicKey = useCallback(async () => {
    if (!solanaChain) return null;
    return await solanaChain.getPublicKey();
  }, [solanaChain]);

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
