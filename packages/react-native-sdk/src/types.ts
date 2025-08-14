import type { EmbeddedProviderConfig } from "@phantom/embedded-provider-core";

export interface PhantomSDKConfig extends EmbeddedProviderConfig {
  /** Custom URL scheme for your app (e.g., "myapp") */
  scheme: string;
  /** Enable debug logging */
  debug?: boolean;
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
