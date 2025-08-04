import { debug, DebugCategory } from "../../debug";

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
  status: "started" | "completed" | "failed";
  createdAt: number;
  lastUsed: number;
}

export class IndexedDBStorage {
  private dbName = "phantom-browser-sdk";
  private storeName = "sessions";
  private version = 1;

  async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getSession(): Promise<Session | null> {
    debug.debug(DebugCategory.STORAGE, 'Getting session from IndexedDB');
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get("currentSession");

      request.onsuccess = () => {
        const session = request.result || null;
        if (session) {
          debug.info(DebugCategory.STORAGE, 'Session found', { 
            sessionId: session.sessionId,
            walletId: session.walletId,
            authProvider: session.authProvider,
            status: session.status,
            createdAt: session.createdAt,
            lastUsed: session.lastUsed
          });
        } else {
          debug.debug(DebugCategory.STORAGE, 'No session found in storage');
        }
        resolve(session);
      };
      request.onerror = () => {
        debug.error(DebugCategory.STORAGE, 'Failed to get session', { error: request.error });
        reject(request.error);
      };
    });
  }

  async saveSession(session: Session): Promise<void> {
    debug.debug(DebugCategory.STORAGE, 'Saving session to IndexedDB', {
      sessionId: session.sessionId,
      walletId: session.walletId,
      authProvider: session.authProvider,
      status: session.status,
      lastUsed: session.lastUsed
    });
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(session, "currentSession");

      request.onsuccess = () => {
        debug.info(DebugCategory.STORAGE, 'Session saved successfully');
        resolve();
      };
      request.onerror = () => {
        debug.error(DebugCategory.STORAGE, 'Failed to save session', { error: request.error });
        reject(request.error);
      };
    });
  }

  async clearSession(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete("currentSession");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
