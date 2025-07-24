import type { NetworkId, AddressType } from '@phantom/client';

export interface BrowserSDKConfig {
  providerType: 'injected' | 'embedded';
  appName?: string;
  // For embedded provider
  apiBaseUrl?: string;
  organizationId?: string;
  authUrl?: string;
  embeddedWalletType?: 'app-wallet' | 'user-wallet';
}

export interface WalletAddress {
  addressType: AddressType;
  address: string;
}

export interface ConnectResult {
  walletId?: string; // Only for embedded
  addresses: WalletAddress[];
}

export interface SignMessageParams {
  message: string; // base64url encoded
  networkId: NetworkId;
}

export interface SignAndSendTransactionParams {
  transaction: string; // base64url encoded
  networkId: NetworkId;
}

export interface SignedTransaction {
  rawTransaction: string;
}

export interface Provider {
  connect(): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  signMessage(walletId: string | null, params: SignMessageParams): Promise<string>;
  signAndSendTransaction(walletId: string | null, params: SignAndSendTransactionParams): Promise<SignedTransaction>;
  getAddresses(): Promise<WalletAddress[]>;
  isConnected(): boolean;
}