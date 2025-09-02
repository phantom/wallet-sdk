import { type AddressType } from "@phantom/client";

export interface ServerSDKConfig {
  apiPrivateKey: string;
  organizationId: string;
  appId: string;
  apiBaseUrl: string;
  solanaRpcUrl?: string;
}

export interface WalletAddress {
  addressType: AddressType;
  address: string;
}
