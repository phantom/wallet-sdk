import type { EmbeddedProviderAuthType } from "../types";

export interface AuthResult {
  walletId: string;
  organizationId: string; // Organization ID returned from auth flow
  provider: EmbeddedProviderAuthType;
  accountDerivationIndex: number; // Account derivation index from auth response
  expiresInMs: number; // Authenticator expiration time from auth response (for user-wallets)
  authUserId?: string; // User ID returned from auth flow (optional, for user-wallets)
}

export interface PhantomConnectOptions {
  publicKey: string;
  appId: string;
  provider: EmbeddedProviderAuthType;
  redirectUrl?: string;
  authUrl?: string;
  sessionId: string;
  // OAuth session management parameters
  clearPreviousSession?: boolean; // Whether to clear previous OAuth session (default: false)
  allowRefresh?: boolean; // Whether to allow OAuth session refresh (default: true)
}

export interface AuthProvider {
  authenticate(options: PhantomConnectOptions): Promise<void | AuthResult>;
  resumeAuthFromRedirect?(provider: EmbeddedProviderAuthType): AuthResult | null;
}

export interface PhantomAppAuthOptions {
  publicKey: string;
  appId: string;
  sessionId: string;
}

export interface PhantomAppProvider {
  authenticate(options: PhantomAppAuthOptions): Promise<AuthResult>;
  isAvailable(): boolean;
}
