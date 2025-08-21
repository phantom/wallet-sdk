import type { Provider } from '@phantom/browser-sdk';
import { NetworkId } from '@phantom/constants';
import { AddressType } from '@phantom/client';
import type { EthereumProvider, SolanaProvider, ChainInfo, InjectedProviderExtensions, EmbeddedProvider } from './types';
import { EmbeddedEthereumBridge } from './bridges/EmbeddedEthereumBridge';
import { EmbeddedSolanaBridge } from './bridges/EmbeddedSolanaBridge';

export class PhantomConnector {
  private provider: Provider;
  private type: 'injected' | 'embedded';
  private ethereumBridge?: EmbeddedEthereumBridge;
  private solanaBridge?: EmbeddedSolanaBridge;

  constructor(provider: Provider, type: 'injected' | 'embedded') {
    this.provider = provider;
    this.type = type;
  }

  /**
   * Get Ethereum provider for specified chain
   * Handles chain switching automatically
   */
  async getEthereumProvider(chainId: number = 1): Promise<EthereumProvider> {
    if (this.type === 'injected') {
      // Use injected ethereum provider directly
      const injectedProvider = this.provider as Provider & InjectedProviderExtensions;
      const ethProvider = injectedProvider.getInjectedEthereumProvider();
      
      // Switch chain if needed
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
      
      return ethProvider;
    } else {
      // Create/update embedded bridge
      const networkId = this.chainIdToNetworkId(chainId);
      
      if (!this.ethereumBridge) {
        this.ethereumBridge = new EmbeddedEthereumBridge(
          this.provider as Provider & EmbeddedProvider, 
          networkId
        );
      } else {
        await this.ethereumBridge.switchChain(chainId);
      }
      
      return this.ethereumBridge;
    }
  }

  /**
   * Get Solana provider for specified network
   * Handles network switching automatically
   */
  async getSolanaProvider(networkId: NetworkId = NetworkId.SOLANA_MAINNET): Promise<SolanaProvider> {
    if (this.type === 'injected') {
      // Use injected solana provider directly
      const injectedProvider = this.provider as Provider & InjectedProviderExtensions;
      const solProvider = injectedProvider.getInjectedSolanaProvider();
      
      // Network switching for Solana (if supported by extension)
      if (solProvider.switchNetwork) {
        await solProvider.switchNetwork(networkId);
      }
      
      return solProvider;
    } else {
      // Create/update embedded bridge
      if (!this.solanaBridge) {
        this.solanaBridge = new EmbeddedSolanaBridge(
          this.provider as Provider & EmbeddedProvider, 
          networkId
        );
      } else {
        await this.solanaBridge.switchNetwork(networkId);
      }
      
      return this.solanaBridge;
    }
  }

  /**
   * Get supported chains based on wallet addresses
   */
  getSupportedChains(): ChainInfo[] {
    const addresses = this.provider.getAddresses();
    const chains: ChainInfo[] = [];

    if (addresses.some(addr => addr.addressType === AddressType.solana)) {
      chains.push(
        { 
          chainType: 'solana', 
          networkId: NetworkId.SOLANA_MAINNET, 
          name: 'Solana Mainnet', 
          isActive: true 
        },
        { 
          chainType: 'solana', 
          networkId: NetworkId.SOLANA_DEVNET, 
          name: 'Solana Devnet', 
          isActive: false 
        }
      );
    }

    if (addresses.some(addr => addr.addressType === AddressType.ethereum)) {
      chains.push(
        { 
          chainType: 'ethereum', 
          networkId: NetworkId.ETHEREUM_MAINNET, 
          chainId: 1, 
          name: 'Ethereum', 
          isActive: true 
        },
        { 
          chainType: 'ethereum', 
          networkId: NetworkId.POLYGON_MAINNET, 
          chainId: 137, 
          name: 'Polygon', 
          isActive: false 
        },
        { 
          chainType: 'ethereum', 
          networkId: NetworkId.OPTIMISM_MAINNET, 
          chainId: 10, 
          name: 'Optimism', 
          isActive: false 
        }
      );
    }

    return chains;
  }

  private chainIdToNetworkId(chainId: number): NetworkId {
    const mapping: Record<number, NetworkId> = {
      1: NetworkId.ETHEREUM_MAINNET,
      137: NetworkId.POLYGON_MAINNET,
      10: NetworkId.OPTIMISM_MAINNET,
      42161: NetworkId.ARBITRUM_ONE,
      8453: NetworkId.BASE_MAINNET,
      // Add more as needed
    };
    return mapping[chainId] || NetworkId.ETHEREUM_MAINNET;
  }
}