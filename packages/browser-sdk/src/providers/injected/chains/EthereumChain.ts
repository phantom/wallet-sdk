import type { IEthereumChain, EthTransactionRequest } from '@phantom/chains';
import { getExplorerUrl, NetworkId, chainIdToNetworkId } from '@phantom/constants';
import type { ParsedSignatureResult, ParsedTransactionResult } from '@phantom/parsers';

/**
 * Injected Ethereum chain implementation that directly uses window.phantom.ethereum
 */
export class InjectedEthereumChain implements IEthereumChain {
  private get phantom() {
    if (typeof window === 'undefined' || !window.phantom?.ethereum) {
      throw new Error('Phantom Ethereum provider not found');
    }
    return window.phantom.ethereum;
  }

  async request<T = any>(args: { method: string; params?: unknown[] }): Promise<T> {
    return await this.phantom.request(args);
  }

  async signPersonalMessage(message: string, address: string): Promise<ParsedSignatureResult> {
    const signature = await this.request<string>({
      method: 'personal_sign',
      params: [message, address]
    });
    return {
      signature,
      rawSignature: signature,
      // No explorer URL for signatures
    };
  }

  async signTypedData(typedData: any, address: string): Promise<ParsedSignatureResult> {
    const signature = await this.request<string>({
      method: 'eth_signTypedData_v4',
      params: [address, JSON.stringify(typedData)]
    });
    
    return {
      signature,
      rawSignature: signature,
      // No explorer URL for signatures
    };
  }

  async sendTransaction(transaction: EthTransactionRequest): Promise<ParsedTransactionResult> {
    const hash = await this.request<string>({
      method: 'eth_sendTransaction',
      params: [transaction]
    });
    
    // Get current network for explorer URL
    const chainId = await this.getChainId();
    const networkId = chainIdToNetworkId(chainId) || NetworkId.ETHEREUM_MAINNET;
    
    return {
      hash,
      rawTransaction: hash, // For injected provider, we only have the hash
      blockExplorer: getExplorerUrl(networkId, 'transaction', hash)
    };
  }

  async switchChain(chainId: number): Promise<void> {
    return this.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }]
    });
  }

  async getChainId(): Promise<number> {
    const chainId = await this.request<string>({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  }

  async getAccounts(): Promise<string[]> {
    return this.request({ method: 'eth_accounts' });
  }

  isConnected(): boolean {
    return this.phantom?.isConnected === true;
  }
}