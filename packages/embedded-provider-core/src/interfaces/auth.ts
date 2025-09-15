export interface AuthResult {
  walletId: string;
  provider?: string;
  userInfo?: Record<string, any>;
  accountDerivationIndex?: number; // Account derivation index from auth response
}

export interface PhantomConnectOptions {
  organizationId: string;
  appId: string;
  provider?: "google" | "apple";
  redirectUrl?: string;
  customAuthData?: Record<string, any>;
  authUrl?: string;
  sessionId: string;
}

export interface JWTAuthOptions {
  appId: string;
  organizationId: string;
  jwtToken: string;
  customAuthData?: Record<string, any>;
}

export interface AuthProvider {
  authenticate(options: PhantomConnectOptions | JWTAuthOptions): Promise<void | AuthResult>;
  resumeAuthFromRedirect?(): AuthResult | null;
}
