import { DerivationInfoAddressFormatEnum } from "@phantom/openapi-wallet-service";

export interface ServerSDKConfig {
  apiPrivateKey: string;
  organizationId: string;
  apiBaseUrl: string;
  solanaRpcUrl?: string;
}

export interface WalletAddress {
  addressType: DerivationInfoAddressFormatEnum;
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

