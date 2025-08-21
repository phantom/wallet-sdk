import type { EthereumProvider, EmbeddedProvider, WalletAddress } from '../types';
import { NetworkId } from '@phantom/constants';
import { AddressType } from '@phantom/client';

export class EmbeddedEthereumBridge implements EthereumProvider {
  private embeddedProvider: EmbeddedProvider;
  private currentNetworkId: NetworkId;
  private currentChainId: number;
  private eventTarget = new EventTarget();
  private listenerMap = new WeakMap<(...args: any[]) => void, (e: any) => void>();

  constructor(embeddedProvider: EmbeddedProvider, initialNetworkId: NetworkId) {
    this.embeddedProvider = embeddedProvider;
    this.currentNetworkId = initialNetworkId;
    this.currentChainId = this.networkIdToChainId(initialNetworkId);
  }

  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    switch (args.method) {
      case 'eth_chainId':
        return `0x${this.currentChainId.toString(16)}`;
        
      case 'wallet_switchEthereumChain': {
        const [{ chainId }] = args.params as [{ chainId: string }];
        await this.switchChain(parseInt(chainId, 16));
        return null;
      }
        
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return this.embeddedProvider.getAddresses()
          .filter((addr: WalletAddress) => addr.addressType === AddressType.ethereum)
          .map((addr: WalletAddress) => addr.address);
          
      case 'personal_sign': {
        const [message, _address] = args.params as [string, string];
        const result = await this.embeddedProvider.signMessage({
          message,
          networkId: this.currentNetworkId,
        });
        return result.signature;
      }
        
      case 'eth_sendTransaction': {
        const [txParams] = args.params as [Record<string, unknown>];
        const txResult = await this.embeddedProvider.signAndSendTransaction({
          transaction: txParams,
          networkId: this.currentNetworkId,
        });
        return txResult.hash;
      }
        
      // Note: eth_signTypedData_v4 NOT implemented yet per requirements
      // Will be added later when we decide how to handle it
      
      default:
        throw new Error(`Method ${args.method} not supported by embedded Ethereum bridge`);
    }
  }

  switchChain(chainId: number): void {
    const networkId = this.chainIdToNetworkId(chainId);
    
    if (!networkId) {
      throw new Error(`Unsupported chainId: ${chainId}`);
    }

    // Validate that embedded provider supports this network
    const supportedAddresses = this.embeddedProvider.getAddresses();
    const hasEthereumAddress = supportedAddresses.some((addr: WalletAddress) => addr.addressType === AddressType.ethereum);
    
    if (!hasEthereumAddress) {
      throw new Error('Ethereum not supported for this wallet');
    }

    const _oldChainId = this.currentChainId;
    this.currentChainId = chainId;
    this.currentNetworkId = networkId;

    // Emit chainChanged event
    const event = new CustomEvent('chainChanged', { 
      detail: { chainId: `0x${chainId.toString(16)}` } 
    });
    this.eventTarget.dispatchEvent(event);

    // console.log(`Switched from chain ${oldChainId} to ${chainId} (${networkId})`);
  }

  // Standard properties
  get isPhantom() { return true; }
  
  get selectedAddress() { 
    const ethAddresses = this.embeddedProvider.getAddresses()
      .filter((addr: WalletAddress) => addr.addressType === AddressType.ethereum);
    return ethAddresses[0]?.address || null;
  }
  
  get chainId() { return `0x${this.currentChainId.toString(16)}`; }
  
  get isConnected() { return this.embeddedProvider.isConnected(); }
  
  // Event handling
  on(event: string, listener: (...args: any[]) => void) {
    if (event === 'chainChanged' || event === 'accountsChanged') {
      const wrappedListener = (e: any) => listener(e.detail);
      this.listenerMap.set(listener, wrappedListener);
      this.eventTarget.addEventListener(event, wrappedListener);
    }
  }
  
  off(event: string, listener: (...args: any[]) => void) {
    const wrappedListener = this.listenerMap.get(listener);
    if (wrappedListener) {
      this.eventTarget.removeEventListener(event, wrappedListener);
      this.listenerMap.delete(listener);
    }
  }

  private networkIdToChainId(networkId: NetworkId): number {
    const networkMap: Partial<Record<NetworkId, number>> = {
      [NetworkId.ETHEREUM_MAINNET]: 1,
      [NetworkId.POLYGON_MAINNET]: 137,
      [NetworkId.OPTIMISM_MAINNET]: 10,
      [NetworkId.ARBITRUM_ONE]: 42161,
      [NetworkId.BASE_MAINNET]: 8453,
      // Add more as needed
    };
    return networkMap[networkId] || 1;
  }
  
  private chainIdToNetworkId(chainId: number): NetworkId | null {
    const chainMap: Record<number, NetworkId> = {
      1: NetworkId.ETHEREUM_MAINNET,
      137: NetworkId.POLYGON_MAINNET,
      10: NetworkId.OPTIMISM_MAINNET,
      42161: NetworkId.ARBITRUM_ONE,
      8453: NetworkId.BASE_MAINNET,
      // Add more as needed
    };
    return chainMap[chainId] || null;
  }
}