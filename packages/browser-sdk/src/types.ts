import type { AddressType } from "@phantom/client";
import type {
  WalletAddress,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignMessageResult,
  SignedTransaction,
  AuthOptions,
} from "@phantom/embedded-provider-core";

import type { DebugCallback, DebugLevel } from "./debug";

export interface BrowserSDKConfig {
  providerType: "injected" | "embedded" | (string & Record<never, never>);
  appName?: string;
  // Address types to enable (applies to both injected and embedded providers)
  addressTypes?: AddressType[];
  // For embedded provider
  apiBaseUrl?: string;
  organizationId?: string;
  authOptions?: {
    authUrl?: string;
    redirectUrl?: string;
  };
  embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
  solanaProvider?: "web3js" | "kit"; // Solana library choice (default: 'web3js')
  serverUrl?: string; // URL to your backend API endpoint (e.g., "http://localhost:3000/api")
  // Debug options
  debug?: {
    enabled?: boolean;
    level?: DebugLevel;
    callback?: DebugCallback;
  };
}

export interface CreateUserOrganizationParams {
  userId: string;
  [key: string]: any; // Allow additional options
}

export interface CreateUserOrganizationResult {
  organizationId: string;
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
