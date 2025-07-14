export interface ServerSDKConfig {
  apiPrivateKey: string;
  organizationId: string;
  apiBaseUrl: string;
  solanaRpcUrl?: string;
}

export interface WalletAddress {
  networkId: string;
  address: string;
}

export interface CreateWalletResult {
  walletId: string;
  addresses: WalletAddress[];
}

export interface Transaction {
  from: string;
  to: string;
  data: string;
  value?: string;
  networkId: string;
}

export interface SignedTransaction {
  txHash: string;
  signature: string;
  rawTransaction: string;
}

