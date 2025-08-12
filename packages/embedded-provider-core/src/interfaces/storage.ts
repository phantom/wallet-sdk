export interface Keypair {
  publicKey: string;
  secretKey: string;
}

export interface StamperInfo {
  keyId: string;
  publicKey: string;
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
}

export interface EmbeddedStorage {
  getSession(): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
  clearSession(): Promise<void>;
}
