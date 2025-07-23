const DB_NAME = 'phantom-embedded-wallet';
const DB_VERSION = 1;
const STORE_NAME = 'session';

export interface SessionData {
  walletId: string;
  organizationId: string;
  keypair: {
    publicKey: string;
    secretKey: string;
  };
}

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async getSession(): Promise<SessionData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current-session');

      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSession(data: SessionData): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: 'current-session', data });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearSession(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('current-session');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async generateKeypair(): Promise<{ publicKey: string; secretKey: string }> {
    // Generate Ed25519 keypair using Web Crypto API
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      },
      true,
      ['sign', 'verify']
    );

    // Export keys
    const publicKeyData = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    // Convert to base64
    const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyData)));
    const secretKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyData)));

    return { publicKey, secretKey };
  }
}