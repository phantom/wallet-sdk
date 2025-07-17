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

export interface Wallet {
  walletId: string;
  walletName: string;
}

export interface GetWalletsResult {
  wallets: Wallet[];
  totalCount: number;
  limit: number;
  offset: number;
}

