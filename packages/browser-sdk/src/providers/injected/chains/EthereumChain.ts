import type { IEthereumChain, EthTransactionRequest } from '@phantom/chains';
import { getExplorerUrl, NetworkId, chainIdToNetworkId } from '@phantom/constants';
import type { ParsedSignatureResult, ParsedTransactionResult } from '@phantom/parsers';
import type { Ethereum } from '@phantom/browser-injected-sdk/ethereum';
import type { Extension } from '@phantom/browser-injected-sdk';

interface PhantomExtended {
  extension: Extension;
  ethereum: Ethereum;
}

/**
 * Injected Ethereum chain implementation that uses browser-injected-sdk
 */
export class InjectedEthereumChain implements IEthereumChain {
  private phantom: PhantomExtended;

  constructor(phantom: PhantomExtended) {
    this.phantom = phantom;
  }

  async request<T = any>(args: { method: string; params?: unknown[] }): Promise<T> {
    const provider = await this.phantom.ethereum.getProvider();
    return await provider.request(args);
  }

  async signPersonalMessage(message: string, address: string): Promise<ParsedSignatureResult> {
    const signature = await this.phantom.ethereum.signPersonalMessage(message, address);
    return {
      signature,
      rawSignature: signature,
    };
  }

  async signTypedData(typedData: any, address: string): Promise<ParsedSignatureResult> {
    const signature = await this.phantom.ethereum.signTypedData(typedData, address);
    return {
      signature,
      rawSignature: signature,
    };
  }

  async sendTransaction(transaction: EthTransactionRequest): Promise<ParsedTransactionResult> {
    const hash = await this.phantom.ethereum.sendTransaction(transaction);

    // Get current network for explorer URL
    const chainId = await this.getChainId();
    const networkId = chainIdToNetworkId(chainId) || NetworkId.ETHEREUM_MAINNET;

    return {
      hash,
      rawTransaction: hash,
      blockExplorer: getExplorerUrl(networkId, 'transaction', hash)
    };
  }

  async switchChain(chainId: number): Promise<void> {
    return await this.phantom.ethereum.switchChain(chainId);
  }

  async getChainId(): Promise<number> {
    return await this.phantom.ethereum.getChainId();
  }

  async getAccounts(): Promise<string[]> {
    return await this.phantom.ethereum.getAccounts();
  }

  isConnected(): boolean {
    try {
      return !!this.phantom.extension?.isInstalled();
    } catch {
      return false;
    }
  }
}