import type { ParsedSignatureResult, ParsedTransactionResult } from '@phantom/parsers';

export interface EthTransactionRequest {
  to?: string;
  from?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  data?: string;
  nonce?: string;
  type?: string;
  chainId?: string;
}

export interface IEthereumChain {
  /**
   * Make an EIP-1193 compatible request
   */
  request<T = any>(args: { method: string; params?: unknown[] }): Promise<T>;

  /**
   * Sign a personal message
   */
  signPersonalMessage(message: string, address: string): Promise<ParsedSignatureResult>;

  /**
   * Sign typed data (EIP-712)
   */
  signTypedData(typedData: any, address: string): Promise<ParsedSignatureResult>;

  /**
   * Send a transaction
   */
  sendTransaction(transaction: EthTransactionRequest): Promise<ParsedTransactionResult>;

  /**
   * Switch to a different chain
   */
  switchChain(chainId: number): Promise<void>;

  /**
   * Get current chain ID
   */
  getChainId(): Promise<number>;

  /**
   * Get connected accounts
   */
  getAccounts(): Promise<string[]>;

  /**
   * Check if connected to Ethereum wallet
   */
  isConnected(): boolean;
}