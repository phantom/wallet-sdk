import type { EmbeddedStorage, Session } from "@phantom/embedded-provider-core";
import { debug, DebugCategory } from "../../../debug";

/**
 * Browser storage implementation using IndexedDB
 *
 * This implementation provides persistent storage for wallet sessions using the browser's
 * IndexedDB API. IndexedDB offers several advantages for wallet applications:
 *
 * - **Persistence**: Data survives browser restarts and tab closures
 * - **Security**: Origin-based isolation prevents cross-site access
 * - **Capacity**: Much larger storage limits compared to localStorage
 * - **Structured**: Supports complex objects without JSON serialization
 * - **Asynchronous**: Non-blocking operations that don't freeze the UI
 *
 * Session data includes wallet keypairs, authentication state, and user information.
 * All sensitive cryptographic material is stored securely within the browser's
 * sandboxed storage environment.
 */
export class BrowserStorage implements EmbeddedStorage {
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
    debug.log(DebugCategory.STORAGE, "Getting session from IndexedDB");
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get("currentSession");

      request.onsuccess = () => {
        const session = request.result || null;
        debug.log(DebugCategory.STORAGE, "Retrieved session from IndexedDB", {
          hasSession: !!session,
          sessionId: session?.sessionId,
        });
        resolve(session);
      };

      request.onerror = () => {
        debug.error(DebugCategory.STORAGE, "Failed to get session from IndexedDB", { error: request.error });
        reject(request.error);
      };
    });
  }

  async saveSession(session: Session): Promise<void> {
    debug.log(DebugCategory.STORAGE, "Saving session to IndexedDB", {
      sessionId: session.sessionId,
      walletId: session.walletId,
      status: session.status,
    });
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(session, "currentSession");

      request.onsuccess = () => {
        debug.log(DebugCategory.STORAGE, "Successfully saved session to IndexedDB");
        resolve();
      };

      request.onerror = () => {
        debug.error(DebugCategory.STORAGE, "Failed to save session to IndexedDB", { error: request.error });
        reject(request.error);
      };
    });
  }

  async clearSession(): Promise<void> {
    debug.log(DebugCategory.STORAGE, "Clearing session from IndexedDB");
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete("currentSession");

      request.onsuccess = () => {
        debug.log(DebugCategory.STORAGE, "Successfully cleared session from IndexedDB");
        resolve();
      };

      request.onerror = () => {
        debug.error(DebugCategory.STORAGE, "Failed to clear session from IndexedDB", { error: request.error });
        reject(request.error);
      };
    });
  }

  async getShouldClearPreviousSession(): Promise<boolean> {
    debug.log(DebugCategory.STORAGE, "Getting shouldClearPreviousSession flag from IndexedDB");
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get("shouldClearPreviousSession");

      request.onsuccess = () => {
        const shouldClear = request.result ?? false;
        debug.log(DebugCategory.STORAGE, "Retrieved shouldClearPreviousSession flag from IndexedDB", {
          shouldClear,
        });
        resolve(shouldClear);
      };

      request.onerror = () => {
        debug.error(DebugCategory.STORAGE, "Failed to get shouldClearPreviousSession flag from IndexedDB", {
          error: request.error,
        });
        reject(request.error);
      };
    });
  }

  async setShouldClearPreviousSession(should: boolean): Promise<void> {
    debug.log(DebugCategory.STORAGE, "Setting shouldClearPreviousSession flag in IndexedDB", { should });
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(should, "shouldClearPreviousSession");

      request.onsuccess = () => {
        debug.log(DebugCategory.STORAGE, "Successfully set shouldClearPreviousSession flag in IndexedDB");
        resolve();
      };

      request.onerror = () => {
        debug.error(DebugCategory.STORAGE, "Failed to set shouldClearPreviousSession flag in IndexedDB", {
          error: request.error,
        });
        reject(request.error);
      };
    });
  }
}
