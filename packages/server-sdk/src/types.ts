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

export type Transaction = Uint8Array;

export interface SignedTransaction {
  rawTransaction: string;
}

