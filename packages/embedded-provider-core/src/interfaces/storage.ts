export interface Keypair {
  publicKey: string;
  secretKey: string;
}

export interface Session {
  sessionId: string;
  walletId: string;
  organizationId: string;
  keypair: Keypair;
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
