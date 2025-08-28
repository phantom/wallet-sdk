import { useCallback, useMemo } from 'react';
import { usePhantom } from '../PhantomProvider';
import type { IEthereumChain, EthTransactionRequest } from '@phantom/chains';

/**
 * Hook for Ethereum chain operations in React Native
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
    return await ethereumChain.request(args);
  }, [ethereumChain]);
  
  const signPersonalMessage = useCallback(async (message: string, address: string) => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return await ethereumChain.signPersonalMessage(message, address);
  }, [ethereumChain]);
  
  const sendTransaction = useCallback(async (transaction: EthTransactionRequest) => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return await ethereumChain.sendTransaction(transaction);
  }, [ethereumChain]);
  
  const switchChain = useCallback(async (chainId: number) => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return await ethereumChain.switchChain(chainId);
  }, [ethereumChain]);
  
  const getChainId = useCallback(async () => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return await ethereumChain.getChainId();
  }, [ethereumChain]);
  
  const getAccounts = useCallback(async () => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    return await ethereumChain.getAccounts();
  }, [ethereumChain]);
  
  // Common Ethereum operations
  const signMessage = useCallback(async (message: string) => {
    const accounts = await getAccounts();
    return await request<string>({
      method: 'eth_sign',
      params: [accounts[0], message]
    });
  }, [request, getAccounts]);
  
  const signTypedData = useCallback(async (typedData: any) => {
    if (!ethereumChain) throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    const accounts = await getAccounts();
    return await ethereumChain.signTypedData(typedData, accounts[0]);
  }, [ethereumChain, getAccounts]);
  
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