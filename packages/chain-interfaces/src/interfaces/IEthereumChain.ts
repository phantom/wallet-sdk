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
  readonly chainId: string;
  readonly accounts: string[];

  request<T = any>(args: { method: string; params?: unknown[] }): Promise<T>;

  connect(): Promise<string[]>;
  disconnect(): Promise<void>;

  signPersonalMessage(message: string, address: string): Promise<string>;
  signTypedData(typedData: any, address: string): Promise<string>;
  signTransaction(transaction: EthTransactionRequest): Promise<string>;
  sendTransaction(transaction: EthTransactionRequest): Promise<string>;
  switchChain(chainId: number | string): Promise<void>;
  getChainId(): Promise<number>;
  getAccounts(): Promise<string[]>;
  isConnected(): boolean;

  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
}
