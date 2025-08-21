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
import { AddressType } from "@phantom/client";

import type { DebugCallback, DebugLevel } from "./debug";

// Debug configuration - separate from SDK config to avoid unnecessary reinstantiation
export interface DebugConfig {
  enabled?: boolean;
  level?: DebugLevel;
  callback?: DebugCallback;
}

export interface BrowserSDKConfig extends Partial<EmbeddedProviderConfig> {
  providerType: "injected" | "embedded" | (string & Record<never, never>);
  addressTypes: [AddressType, ...AddressType[]]
  // Required for embedded provider, optional for injected
  apiBaseUrl?: string;
  organizationId?: string;
  embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
  // Auto-connect to existing sessions (default: true)
  autoConnect?: boolean;
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
export { AddressType }

export interface Provider {
  connect(authOptions?: AuthOptions): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  signMessage(params: SignMessageParams): Promise<SignMessageResult>;
  signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction>;
  getAddresses(): WalletAddress[];
  isConnected(): boolean;
}
