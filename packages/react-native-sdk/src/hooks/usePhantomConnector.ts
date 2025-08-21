import { useMemo, useCallback } from 'react';
import { usePhantom } from '../PhantomProvider';
import { PhantomConnector } from '@phantom/phantom-connector';
import type { NetworkId } from '@phantom/constants';
import type { EthereumProvider, SolanaProvider, ChainInfo } from '@phantom/phantom-connector';

/**
 * Hook that provides access to the Phantom Connector for multi-chain operations.
 * This works only with embedded providers in React Native.
 * 
 * @returns Object with connector methods for Ethereum and Solana
 * @throws Error if used outside of PhantomProvider context
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { getEthereumProvider, getSolanaProvider, getSupportedChains } = usePhantomConnector();
 *   
 *   const handleEthereumSign = async () => {
 *     const ethProvider = await getEthereumProvider(1); // Ethereum mainnet
 *     await ethProvider.request({
 *       method: 'personal_sign',
 *       params: ['Hello World', '0x...']
 *     });
 *   };
 *   
 *   const handleSolanaSign = async () => {
 *     const solanaProvider = await getSolanaProvider(NetworkId.SOLANA_MAINNET);
 *     const message = new TextEncoder().encode('Hello Solana');
 *     await solanaProvider.signMessage(message);
 *   };
 *   
 *   return (
 *     <View>
 *       <Button onPress={handleEthereumSign} title="Sign with Ethereum" />
 *       <Button onPress={handleSolanaSign} title="Sign with Solana" />
 *     </View>
 *   );
 * }
 * ```
 */
export function usePhantomConnector() {
  const context = usePhantom();

  if (!context) {
    throw new Error('usePhantomConnector must be used within a PhantomProvider');
  }

  const { sdk } = context;

  // Create connector instance - React Native only uses embedded providers
  const connector = useMemo(() => {
    if (!sdk) return null;

    // Cast the EmbeddedProvider from embedded-provider-core to match connector interface
    return new PhantomConnector(sdk, 'embedded');
  }, [sdk]);

  /**
   * Get Ethereum provider for the specified chain ID.
   * Automatically handles chain switching.
   * 
   * @param chainId - The chain ID to connect to (default: 1 for Ethereum mainnet)
   * @returns Promise that resolves to an EIP-1193 compatible Ethereum provider
   * @throws Error if connector is not available or chain switching fails
   */
  const getEthereumProvider = useCallback(async (chainId?: number): Promise<EthereumProvider> => {
    if (!connector) {
      throw new Error('No connector available - wallet not connected');
    }

    return await connector.getEthereumProvider(chainId);
  }, [connector]);

  /**
   * Get Solana provider for the specified network.
   * Automatically handles network switching.
   * 
   * @param networkId - The network ID to connect to (default: SOLANA_MAINNET)
   * @returns Promise that resolves to a standard Solana provider
   * @throws Error if connector is not available or network switching fails
   */
  const getSolanaProvider = useCallback(async (networkId?: NetworkId): Promise<SolanaProvider> => {
    if (!connector) {
      throw new Error('No connector available - wallet not connected');
    }

    return await connector.getSolanaProvider(networkId);
  }, [connector]);

  /**
   * Get information about supported chains based on available wallet addresses.
   * 
   * @returns Array of chain information objects
   */
  const getSupportedChains = useCallback((): ChainInfo[] => {
    if (!connector) {
      return [];
    }

    return connector.getSupportedChains();
  }, [connector]);

  return {
    /**
     * Get Ethereum provider with automatic chain switching
     */
    getEthereumProvider,

    /**
     * Get Solana provider with automatic network switching  
     */
    getSolanaProvider,

    /**
     * Get supported chains based on wallet addresses
     */
    getSupportedChains,

    /**
     * Whether the connector is available (wallet is connected)
     */
    isConnectorReady: connector !== null,
  };
}