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

// Now directly EIP-1193 compliant
export interface IEthereumChain {
  // EIP-1193 required properties
  readonly connected: boolean;
  readonly chainId: string;
  readonly accounts: string[];

  // EIP-1193 core method
  request<T = any>(args: { method: string; params?: unknown[] }): Promise<T>;

  // Connection methods (bound to SDK)
  connect(): Promise<string[]>;
  disconnect(): Promise<void>;

  // Convenience methods (return raw values for standard compliance)
  signPersonalMessage(message: string, address: string): Promise<string>;
  signTypedData(typedData: any, address: string): Promise<string>;
  signTransaction(transaction: EthTransactionRequest): Promise<string>;
  sendTransaction(transaction: EthTransactionRequest): Promise<string>;
  switchChain(chainId: number | string): Promise<void>;
  getChainId(): Promise<number>;
  getAccounts(): Promise<string[]>;
  isConnected(): boolean;

  // Event methods
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;

  // Standard EIP-1193 Events:
  // - connect: (connectInfo: { chainId: string }) => void
  // - disconnect: (error: { code: number; message: string }) => void
  // - accountsChanged: (accounts: string[]) => void
  // - chainChanged: (chainId: string) => void
  // - message: (message: { type: string; data: unknown }) => void
}
