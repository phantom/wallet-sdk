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

import type { DebugCallback, DebugLevel } from "./debug";

export interface BrowserSDKConfig extends Partial<EmbeddedProviderConfig> {
  providerType: "injected" | "embedded" | (string & Record<never, never>);
  // Required for embedded provider, optional for injected
  apiBaseUrl?: string;
  organizationId?: string;
  embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
  // Auto-connect to existing sessions (default: true)
  autoConnect?: boolean;
  // Debug options
  debug?: {
    enabled?: boolean;
    level?: DebugLevel;
    callback?: DebugCallback;
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
};

export interface Provider {
  connect(authOptions?: AuthOptions): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  signMessage(params: SignMessageParams): Promise<SignMessageResult>;
  signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction>;
  getAddresses(): WalletAddress[];
  isConnected(): boolean;
}
