import { useCallback, useMemo } from 'react';
import { usePhantom } from '../PhantomProvider';
import type { IEthereumChain, EthTransactionRequest } from '@phantom/chains';

/**
 * Hook for Ethereum chain operations
 * 
 * @returns Ethereum chain interface and convenient methods
 */
export function useEthereum() {
  const { sdk, isConnected } = usePhantom();
  
  const ethereumChain = useMemo<IEthereumChain | null>(() => {
    if (!sdk || !isConnected) return null;
    try {
      return sdk.ethereum;
    } catch {
      return null; // SDK not connected yet
    }
  }, [sdk, isConnected]);
  
  const request = useCallback(async <T = any>(args: { method: string; params?: unknown[] }): Promise<T> => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return ethereumChain.request(args);
  }, [ethereumChain]);
  
  const signPersonalMessage = useCallback(async (message: string, address: string) => {
    return request<string>({
      method: 'personal_sign',
      params: [message, address]
    });
  }, [request]);
  
  const sendTransaction = useCallback(async (transaction: EthTransactionRequest) => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return ethereumChain.sendTransaction(transaction);
  }, [ethereumChain]);
  
  const switchChain = useCallback(async (chainId: number) => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return ethereumChain.switchChain(chainId);
  }, [ethereumChain]);
  
  const getChainId = useCallback(async () => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return ethereumChain.getChainId();
  }, [ethereumChain]);
  
  const getAccounts = useCallback(async () => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return ethereumChain.getAccounts();
  }, [ethereumChain]);
  
  // Common Ethereum operations
  const signMessage = useCallback(async (message: string) => {
    return request<string>({
      method: 'eth_sign',
      params: [await getAccounts().then(accounts => accounts[0]), message]
    });
  }, [request, getAccounts]);
  
  const signTypedData = useCallback(async (typedData: any) => {
    const accounts = await getAccounts();
    return request<string>({
      method: 'eth_signTypedData_v4',
      params: [accounts[0], JSON.stringify(typedData)]
    });
  }, [request, getAccounts]);
  
  return {
    // Chain instance for advanced usage
    ethereum: ethereumChain,
    
    // Standard EIP-1193 interface
    request,
    
    // Convenient methods
    signPersonalMessage,
    signMessage,
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