import type { NetworkId } from "@phantom/client";

export type WalletType = 'injected' | 'embedded';
export type EmbeddedWalletType = 'new-wallet' | 'phantom-wallet';

export interface PhantomSDKConfig {
  walletType?: WalletType;
  // For embedded wallets
  apiBaseUrl?: string;
  organizationId?: string;
  // For embedded wallet auth flows
  authUrl?: string;
  // Embedded wallet type (only used when walletType is 'embedded')
  embeddedWalletType?: EmbeddedWalletType;
  // Additional config options
  appName?: string;
}

export interface WalletAddress {
  addressType: string;
  address: string;
}

export interface WalletConnection {
  addresses: WalletAddress[];
  walletId?: string; // For embedded wallets
  connected: boolean;
}

export interface SignMessageParams {
  message: string; // base64url encoded message
  networkId: NetworkId;
}

export interface SignAndSendTransactionParams {
  transaction: string; // base64url encoded transaction
  networkId: NetworkId;
}