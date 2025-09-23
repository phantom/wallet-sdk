export interface AuthResult {
  walletId: string;
  organizationId: string; // Organization ID returned from auth flow
  provider?: string;
  userInfo?: Record<string, any>;
  accountDerivationIndex: number; // Account derivation index from auth response
  expiresInMs: number; // Authenticator expiration time from auth response (for user-wallets)
}

export interface PhantomConnectOptions {
  publicKey: string;
  appId: string;
  provider?: "google" | "apple";
  redirectUrl?: string;
  customAuthData?: Record<string, any>;
  authUrl?: string;
  sessionId: string;
}

export interface JWTAuthOptions {
  appId: string;
  publicKey: string;
  jwtToken: string;
  customAuthData?: Record<string, any>;
}

export interface AuthProvider {
  authenticate(options: PhantomConnectOptions | JWTAuthOptions): Promise<void | AuthResult>;
  resumeAuthFromRedirect?(): AuthResult | null;
}
