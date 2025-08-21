import type { EmbeddedProviderConfig } from "@phantom/embedded-provider-core";

// Debug configuration - separate from SDK config for consistency with browser/react SDKs
export interface PhantomDebugConfig {
  /** Enable debug logging */
  enabled?: boolean;
}

export interface PhantomSDKConfig extends EmbeddedProviderConfig {
  /** Custom URL scheme for your app (e.g., "myapp") */
  scheme: string;
  /** Enable auto-connect to existing sessions (default: true) */
  autoConnect?: boolean;
}

export interface ConnectOptions {
  /** OAuth provider to use */
  provider?: "google" | "apple" | "jwt";
  /** JWT token for JWT authentication */
  jwtToken?: string;
  /** Custom authentication data */
  customAuthData?: Record<string, any>;
}

// Re-export core types for convenience
export type {
  WalletAddress,
  SignMessageParams,
  SignMessageResult,
  SignAndSendTransactionParams,
  SignedTransaction,
  AuthOptions,
  ConnectResult,
} from "@phantom/embedded-provider-core";
