import type { NetworkId, AddressType } from "@phantom/client";

export interface BrowserSDKConfig {
  providerType: "injected" | "embedded" | (string & Record<never, never>);
  appName?: string;
  // Address types to enable (applies to both injected and embedded providers)
  addressTypes?: AddressType[];
  // For embedded provider
  apiBaseUrl?: string;
  organizationId?: string;
  authUrl?: string;
  embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
  solanaProvider?: "web3js" | "kit"; // Solana library choice (default: 'web3js')
  serverUrl?: string; // URL to your backend API endpoint (e.g., "http://localhost:3000/api")
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
  message: string;
  networkId: NetworkId;
}

export interface SignAndSendTransactionParams {
  transaction: any; // Native transaction object (Transaction, VersionedTransaction, etc.)
  networkId: NetworkId;
}

export interface SignedTransaction {
  rawTransaction: string;
}

export interface CreateUserOrganizationParams {
  userId: string;
  [key: string]: any; // Allow additional options
}

export interface CreateUserOrganizationResult {
  organizationId: string;
}

export interface Provider {
  connect(): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  signMessage(params: SignMessageParams): Promise<string>;
  signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction>;
  getAddresses(): WalletAddress[];
  isConnected(): boolean;
}
