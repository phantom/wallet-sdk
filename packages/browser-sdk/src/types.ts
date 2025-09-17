import type {
  WalletAddress,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignMessageResult,
  SignedTransaction,
  AuthOptions,
  EmbeddedProviderConfig,
} from "@phantom/embedded-provider-core";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";
import { AddressType } from "@phantom/client";

import type { DebugCallback, DebugLevel } from "./debug";

// Debug configuration - separate from SDK config to avoid unnecessary reinstantiation
export interface DebugConfig {
  enabled?: boolean;
  level?: DebugLevel;
  callback?: DebugCallback;
}

export interface BrowserSDKConfig extends Partial<Omit<EmbeddedProviderConfig, "authOptions">> {
  // Core configuration - works for both provider types
  appId: string; // Required - the app id retrieved from phantom.com/portal
  addressTypes: [AddressType, ...AddressType[]];
  
  // Optional configuration
  apiBaseUrl?: string;
  embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
  authOptions?: {
    authUrl?: string;
    redirectUrl?: string;
  };
}

// Re-export types from core for convenience
export type {
  WalletAddress,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignMessageResult,
  SignedTransaction,
  AuthOptions,
  DebugCallback,
  DebugLevel,
};

// Re-export enums from client for convenience
export { AddressType };

// Extended AuthOptions to include provider selection
export interface BrowserAuthOptions extends AuthOptions {
  providerType?: "injected" | "embedded";
}

export interface Provider {
  connect(authOptions?: BrowserAuthOptions): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  getAddresses(): WalletAddress[];
  isConnected(): boolean;

  // Chain access - providers expose their chains directly
  solana: ISolanaChain;
  ethereum: IEthereumChain;
}
