export type EthereumTransaction = {
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
};

export type EthereumSignInData = {
  domain?: string;
  address?: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
};

export type EthereumEventType = "connect" | "disconnect" | "accountsChanged" | "chainChanged";

export interface PhantomEthereumProvider {
  isPhantom: boolean;
  selectedAddress: string | null;
  chainId: string;
  isConnected: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: EthereumEventType, handler: (...args: any[]) => void) => void;
  off: (event: EthereumEventType, handler: (...args: any[]) => void) => void;
  removeAllListeners: (event?: EthereumEventType) => void;
}

export interface EthereumOperationOptions {
  getProvider?: () => PhantomEthereumProvider | null;
}
