import type { IEthereumChain, EthTransactionRequest } from '@phantom/chains';
import type { EmbeddedProvider } from '../embedded-provider';
import { NetworkId, chainIdToNetworkId, networkIdToChainId } from '@phantom/constants';
import { parseSignMessageResponse, parseTransactionResponse } from '@phantom/parsers';
import type { ParsedSignatureResult, ParsedTransactionResult } from '@phantom/parsers';

/**
 * Embedded Ethereum chain implementation for React Native and web embedded providers
 */
export class EmbeddedEthereumChain implements IEthereumChain {
  private currentNetworkId: NetworkId = NetworkId.ETHEREUM_MAINNET;

  constructor(private provider: EmbeddedProvider) {}

  private ensureConnected(): void {
    if (!this.provider.isConnected()) {
      throw new Error('Ethereum chain not available. Ensure SDK is connected.');
    }
  }

  async request<T = any>(args: { method: string; params?: unknown[] }): Promise<T> {
    this.ensureConnected();
    return this.handleEmbeddedRequest(args);
  }

  async signPersonalMessage(message: string, address: string): Promise<ParsedSignatureResult> {
    const signature = await this.request<string>({
      method: 'personal_sign',
      params: [message, address]
    });
    return parseSignMessageResponse(signature, this.currentNetworkId);
  }

  async signTypedData(typedData: any, address: string): Promise<ParsedSignatureResult> {
    const signature = await this.request<string>({
      method: 'eth_signTypedData_v4',
      params: [address, JSON.stringify(typedData)]
    });
    return parseSignMessageResponse(signature, this.currentNetworkId);
  }

  async sendTransaction(transaction: EthTransactionRequest): Promise<ParsedTransactionResult> {
    const result = await this.provider.signAndSendTransaction({
      transaction,
      networkId: this.currentNetworkId
    });
    return parseTransactionResponse(result.rawTransaction, this.currentNetworkId, result.hash);
  }

  switchChain(chainId: number): Promise<void> {
    const networkId = chainIdToNetworkId(chainId);
    if (!networkId) {
      return Promise.reject(new Error(`Unsupported chainId: ${chainId}`));
    }
    this.currentNetworkId = networkId;
    return Promise.resolve();
  }

  getChainId(): Promise<number> {
    const chainId = networkIdToChainId(this.currentNetworkId);
    return Promise.resolve(chainId || 1); // Default to mainnet
  }

  async getAccounts(): Promise<string[]> {
    return this.request({ method: 'eth_accounts' });
  }

  isConnected(): boolean {
    return this.provider.isConnected();
  }

  private async handleEmbeddedRequest<T>(args: { method: string; params?: unknown[] }): Promise<T> {
    // Convert Ethereum RPC calls to embedded provider API
    switch (args.method) {
      case 'personal_sign': {
        const [message, _address] = args.params as [string, string];
        const result = await this.provider.signMessage({
          message,
          networkId: this.currentNetworkId
        });
        return parseSignMessageResponse(result.signature, this.currentNetworkId).signature as T;
      }
        
      case 'eth_signTypedData_v4': {
        const [_typedDataAddress, typedDataStr] = args.params as [string, string];
        const _typedData = JSON.parse(typedDataStr);
        const typedDataResult = await this.provider.signMessage({
          message: typedDataStr, // Pass the stringified typed data as message
          networkId: this.currentNetworkId
        });
        return parseSignMessageResponse(typedDataResult.signature, this.currentNetworkId).signature as T;
      }
        
      case 'eth_sendTransaction': {
        const [transaction] = args.params as [EthTransactionRequest];
        const sendResult = await this.provider.signAndSendTransaction({
          transaction,
          networkId: this.currentNetworkId
        });
        return parseTransactionResponse(sendResult.rawTransaction, this.currentNetworkId, sendResult.hash).hash as T;
      }
        
      case 'eth_accounts': {
        const addresses = this.provider.getAddresses();
        const ethAddr = addresses.find((a: any) => a.addressType === 'Ethereum');
        return (ethAddr ? [ethAddr.address] : []) as T;
      }
        
      case 'eth_chainId': {
        return `0x${(networkIdToChainId(this.currentNetworkId) || 1).toString(16)}` as T;
      }
        
      case 'wallet_switchEthereumChain': {
        const [{ chainId }] = args.params as [{ chainId: string }];
        const numericChainId = parseInt(chainId, 16);
        await this.switchChain(numericChainId);
        return undefined as T;
      }
        
      default:
        throw new Error(`Embedded provider doesn't support method: ${args.method}`);
    }
  }
}