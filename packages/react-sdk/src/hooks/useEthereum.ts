import { useCallback, useMemo } from "react";
import { usePhantom } from "../PhantomProvider";
import type { IEthereumChain, EthTransactionRequest } from "@phantom/chains";

/**
 * Hook for Ethereum chain operations
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
      return chain.request(args);
    },
    [getEthereumChain],
  );

  const signPersonalMessage = useCallback(
    async (message: string, address: string) => {
      return request<string>({
        method: "personal_sign",
        params: [message, address],
      });
    },
    [request],
  );

  const signTransaction = useCallback(
    async (transaction: EthTransactionRequest): Promise<string> => {
      return request<string>({
        method: "eth_signTransaction",
        params: [transaction],
      });
    },
    [request],
  );

  const sendTransaction = useCallback(
    async (transaction: EthTransactionRequest) => {
      const chain = getEthereumChain();
      return chain.sendTransaction(transaction);
    },
    [getEthereumChain],
  );

  const switchChain = useCallback(
    async (chainId: number) => {
      const chain = getEthereumChain();
      return chain.switchChain(chainId);
    },
    [getEthereumChain],
  );

  const getChainId = useCallback(async () => {
    const chain = getEthereumChain();
    return chain.getChainId();
  }, [getEthereumChain]);

  const getAccounts = useCallback(async () => {
    const chain = getEthereumChain();
    return chain.getAccounts();
  }, [getEthereumChain]);

  // Common Ethereum operations
  const signMessage = useCallback(
    async (message: string) => {
      return request<string>({
        method: "eth_sign",
        params: [await getAccounts().then(accounts => accounts[0]), message],
      });
    },
    [request, getAccounts],
  );

  const signTypedData = useCallback(
    async (typedData: any) => {
      const accounts = await getAccounts();
      return request<string>({
        method: "eth_signTypedData_v4",
        params: [accounts[0], JSON.stringify(typedData)],
      });
    },
    [request, getAccounts],
  );

  const signTransaction = useCallback(
    async (transaction: EthTransactionRequest) => {
      if (!ethereumChain) throw new Error("Ethereum chain not available. Ensure SDK is connected.");
      return ethereumChain.signTransaction(transaction);
    },
    [ethereumChain],
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
    signTransaction,
    sendTransaction,
    switchChain,
    getChainId,
    getAccounts,

    // State
    isAvailable: !!ethereumChain,
    isConnected: ethereumChain?.isConnected() ?? false,
  };
}
