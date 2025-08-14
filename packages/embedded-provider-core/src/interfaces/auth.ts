export interface AuthResult {
  walletId: string;
  provider?: string;
  userInfo?: Record<string, any>;
}

export interface PhantomConnectOptions {
  organizationId: string;
  parentOrganizationId: string;
  provider?: "google" | "apple";
  redirectUrl?: string;
  customAuthData?: Record<string, any>;
  authUrl?: string;
  sessionId: string;
  appName?: string;
  appLogo?: string; // URL to app logo
}

export interface JWTAuthOptions {
  organizationId: string;
  parentOrganizationId: string;
  jwtToken: string;
  customAuthData?: Record<string, any>;
  appName?: string;
  appLogo?: string; // URL to app logo
}

export interface AuthProvider {
  authenticate(options: PhantomConnectOptions | JWTAuthOptions): Promise<void | AuthResult>;
  resumeAuthFromRedirect?(): AuthResult | null;
}
