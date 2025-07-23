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

