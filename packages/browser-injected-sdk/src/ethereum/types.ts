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
  address: `0x${string}`;
  chainId: number;
  domain: string;
  expirationTime?: Date | undefined;
  issuedAt?: Date | undefined;
  nonce: string;
  notBefore?: Date | undefined;
  requestId?: string | undefined;
  resources?: Array<string> | undefined;
  scheme?: string | undefined;
  statement?: string | undefined;
  uri: string;
  version: "1";
};

export type EthereumEventType = "connect" | "disconnect" | "accountsChanged" | "chainChanged";

export interface ProviderRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface PhantomEthereumProvider {
  isPhantom: boolean;
  selectedAddress: string | null;
  chainId: string;
  isConnected: boolean;
  request: <T = any>(args: { method: string; params?: any[] }) => Promise<T>;
  on: (event: EthereumEventType, handler: (...args: any[]) => void) => void;
  off: (event: EthereumEventType, handler: (...args: any[]) => void) => void;
  removeAllListeners: (event?: EthereumEventType) => void;
}

export interface EthereumOperationOptions {
  getProvider?: () => PhantomEthereumProvider | null;
}
