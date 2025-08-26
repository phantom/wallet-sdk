export interface Keypair {
  publicKey: string;
  secretKey: string;
}

export interface StamperInfo {
  keyId: string;
  publicKey: string;
  createdAt?: number; // Optional timestamp when key was created
  expiresAt?: number; // Optional timestamp when key expires
  authenticatorId?: string; // Optional authenticator ID from server
}

export interface Session {
  sessionId: string;
  walletId: string;
  organizationId: string;
  stamperInfo: StamperInfo;
  keypair?: Keypair; // Keep for backward compatibility during migration
  authProvider?: string;
  userInfo?: Record<string, any>;
  status: "pending" | "completed" | "failed";
  createdAt: number;
  lastUsed: number;
  // New fields for authenticator expiration tracking
  authenticatorExpiresAt?: number; // When the authenticator expires
  lastRenewalCheck?: number; // Last time we checked for renewal
}

export interface EmbeddedStorage {
  getSession(): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
  clearSession(): Promise<void>;
}
