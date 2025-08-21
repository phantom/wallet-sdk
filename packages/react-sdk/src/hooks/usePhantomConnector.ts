import { useMemo, useCallback } from 'react';
import { usePhantom } from '../PhantomProvider';
import { PhantomConnector } from '@phantom/phantom-connector';
import type { NetworkId } from '@phantom/constants';
import type { EthereumProvider, SolanaProvider, ChainInfo } from '@phantom/phantom-connector';

interface UsePhantomConnectorReturn {
  connector: PhantomConnector | null;
  getEthereumProvider: (chainId?: number) => Promise<EthereumProvider>;
  getSolanaProvider: (networkId?: NetworkId) => Promise<SolanaProvider>;
  getSupportedChains: () => ChainInfo[];
}

export function usePhantomConnector(): UsePhantomConnectorReturn {
  const context = usePhantom();
  
  if (!context) {
    throw new Error('usePhantomConnector must be used within a PhantomProvider');
  }

  const { sdk, currentProviderType } = context;
  
  const connector = useMemo(() => {
    if (!sdk || !currentProviderType) return null;
    
    const provider = sdk.getCurrentProvider();
    if (!provider) return null;
    
    return new PhantomConnector(provider, currentProviderType);
  }, [sdk, currentProviderType]);

  const getEthereumProvider = useCallback(async (chainId?: number): Promise<EthereumProvider> => {
    if (!connector) {
      throw new Error('No connector available - wallet not connected');
    }
    return connector.getEthereumProvider(chainId);
  }, [connector]);
  
  const getSolanaProvider = useCallback(async (networkId?: NetworkId): Promise<SolanaProvider> => {
    if (!connector) {
      throw new Error('No connector available - wallet not connected');
    }
    return connector.getSolanaProvider(networkId);
  }, [connector]);
  
  const getSupportedChains = useCallback((): ChainInfo[] => {
    if (!connector) return [];
    return connector.getSupportedChains();
  }, [connector]);

  return {
    connector,
    getEthereumProvider,
    getSolanaProvider,
    getSupportedChains,
  };
}