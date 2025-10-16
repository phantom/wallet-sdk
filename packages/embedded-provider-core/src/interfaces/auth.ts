export interface AuthResult {
  walletId: string;
  organizationId: string; // Organization ID returned from auth flow
  provider?: string;
  accountDerivationIndex: number; // Account derivation index from auth response
  expiresInMs: number; // Authenticator expiration time from auth response (for user-wallets)
}

export interface PhantomConnectOptions {
  publicKey: string;
  appId: string;
  provider?: "google" | "apple";
  redirectUrl?: string;
  authUrl?: string;
  sessionId: string;
}

export interface JWTAuthOptions {
  appId: string;
  publicKey: string;
  jwtToken: string;
}

export interface AuthProvider {
  authenticate(options: PhantomConnectOptions | JWTAuthOptions): Promise<void | AuthResult>;
  resumeAuthFromRedirect?(): AuthResult | null;
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
