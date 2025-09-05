import { useCallback, useMemo } from "react";
import { usePhantom } from "../PhantomProvider";
import type { IEthereumChain, EthTransactionRequest } from "@phantom/chains";

/**
 * Hook for Ethereum chain operations in React Native
 *
 * @returns Ethereum chain interface and convenient methods
 */
export function useEthereum() {
  const { sdk, isConnected } = usePhantom();

  // Helper to get current chain state - no memoization to avoid race conditions
  const getEthereumChain = useCallback((): IEthereumChain => {
    if (!sdk) throw new Error("Phantom SDK not initialized.");
    if (!sdk.isConnected()) throw new Error("Phantom SDK not connected. Call connect() first.");
    return sdk.ethereum;
  }, [sdk]);

  // Memoize the chain only for read-only access - methods use real-time access
  const ethereumChain = useMemo<IEthereumChain | null>(() => {
    if (!sdk || !isConnected) return null;
    try {
      return sdk.ethereum;
    } catch {
      return null;
    }
  }, [sdk, isConnected]);

  const request = useCallback(
    async <T = any>(args: { method: string; params?: unknown[] }): Promise<T> => {
      const chain = getEthereumChain();
      return await chain.request(args);
    },
    [getEthereumChain],
  );

  const signPersonalMessage = useCallback(
    async (message: string, address: string) => {
      const chain = getEthereumChain();
      return await chain.signPersonalMessage(message, address);
    },
    [getEthereumChain],
  );

  const signTransaction = useCallback(
    async (transaction: EthTransactionRequest): Promise<string> => {
      return await request<string>({
        method: "eth_signTransaction",
        params: [transaction],
      });
    },
    [request],
  );

  const sendTransaction = useCallback(
    async (transaction: EthTransactionRequest) => {
      const chain = getEthereumChain();
      return await chain.sendTransaction(transaction);
    },
    [getEthereumChain],
  );

  const switchChain = useCallback(
    async (chainId: number) => {
      const chain = getEthereumChain();
      return await chain.switchChain(chainId);
    },
    [getEthereumChain],
  );

  const getChainId = useCallback(async () => {
    const chain = getEthereumChain();
    return await chain.getChainId();
  }, [getEthereumChain]);

  const getAccounts = useCallback(async () => {
    const chain = getEthereumChain();
    return await chain.getAccounts();
  }, [getEthereumChain]);

  // Common Ethereum operations
  const signMessage = useCallback(
    async (message: string) => {
      const accounts = await getAccounts();
      return await request<string>({
        method: "eth_sign",
        params: [accounts[0], message],
      });
    },
    [request, getAccounts],
  );

  const signTypedData = useCallback(
    async (typedData: any) => {
      const chain = getEthereumChain();
      const accounts = await getAccounts();
      return await chain.signTypedData(typedData, accounts[0]);
    },
    [getEthereumChain, getAccounts],
  );

  return {
    // Chain instance for advanced usage
    ethereum: ethereumChain,

    // Standard EIP-1193 interface
    request,

    // Convenient methods
    signPersonalMessage,
    signMessage,
    signTransaction,
    signTypedData,
    sendTransaction,
    switchChain,
    getChainId,
    getAccounts,

    // State
    isAvailable: !!ethereumChain,
    isConnected: ethereumChain?.isConnected() ?? false,
  };
}
