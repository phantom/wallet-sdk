import type { EmbeddedProviderAuthType } from "../types";

export interface Keypair {
  publicKey: string;
  secretKey: string;
}

export interface StamperInfo {
  keyId: string;
  publicKey: string;
  createdAt?: number; // Optional timestamp when key was created
  authenticatorId?: string; // Optional authenticator ID from server
}

export interface Session {
  sessionId: string;
  walletId: string;
  organizationId: string; // Organization ID from auth flow response or local organization for app-wallets
  appId: string;
  stamperInfo: StamperInfo;
  keypair?: Keypair; // Keep for backward compatibility during migration
  authProvider: EmbeddedProviderAuthType; // Auth provider used for authentication
  status: "pending" | "completed" | "failed";
  createdAt: number;
  lastUsed: number;
  // Authenticator lifecycle tracking (session owns the timing)
  authenticatorCreatedAt: number; // When the current authenticator was created
  authenticatorExpiresAt: number; // When the authenticator expires
  lastRenewalAttempt?: number; // Last time we attempted renewal
  // Derivation index for account paths (defaults to 0 for backward compatibility)
  accountDerivationIndex?: number; // Account derivation index from auth flow
  // Phantom user ID from auth flow (for user-wallets)
  authUserId?: string; // User ID returned from Phantom auth service
}

export interface EmbeddedStorage {
  getSession(): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
  clearSession(): Promise<void>;

  // Logout flag management for OAuth session refresh control
  getShouldClearPreviousSession(): Promise<boolean>;
  setShouldClearPreviousSession(should: boolean): Promise<void>;
}
