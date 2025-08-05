import type { 
  EmbeddedProviderConfig, 
  AuthOptions as CoreAuthOptions
} from '@phantom/embedded-provider-core';

export interface PhantomProviderConfig extends Omit<EmbeddedProviderConfig, 'authOptions'> {
  /** Custom URL scheme for your app (e.g., "myapp") */
  scheme: string;
  /** Authentication options */
  authOptions?: ReactNativeAuthOptions;
  /** Enable debug logging */
  debug?: boolean;
}

export interface ReactNativeAuthOptions extends CoreAuthOptions {
  /** Custom redirect URL - defaults to {scheme}://phantom-auth-callback */
  redirectUrl?: string;
}

export interface ConnectOptions {
  /** OAuth provider to use */
  provider?: 'google' | 'apple' | 'jwt';
  /** JWT token for JWT authentication */
  jwtToken?: string;
  /** Custom authentication data */
  customAuthData?: Record<string, any>;
}

// Re-export core types for convenience
export type { 
  WalletAddress, 
  SignMessageParams, 
  SignAndSendTransactionParams, 
  SignedTransaction,
  AuthOptions,
  ConnectResult
} from '@phantom/embedded-provider-core';