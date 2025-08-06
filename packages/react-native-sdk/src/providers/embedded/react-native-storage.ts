import type { EmbeddedStorage, Session } from '@phantom/embedded-provider-core';

interface Keychain {
  setItem: (service: string, username: string, password: string, options?: any) => Promise<void>;
  getItem: (service: string, username: string, options?: any) => Promise<string>;
  removeItem: (service: string, username: string) => Promise<void>;
  hasItem: (service: string, username: string) => Promise<boolean>;
}

interface AsyncStorage {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
}

export class ReactNativeSecureStorage implements EmbeddedStorage {
  private readonly sessionKey = 'phantom_session';
  private readonly service = 'com.phantom.wallet';
  private readonly username = 'phantom_user';
  private keychain: Keychain | null = null;
  private asyncStorage: AsyncStorage | null = null;
  private useEncryption = false;

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    // Try to load react-native-keychain first (most secure)
    try {
      const KeychainModule = require('react-native-keychain');
      if (KeychainModule && KeychainModule.setItem) {
        this.keychain = KeychainModule;
        console.log('[ReactNativeSecureStorage] Using react-native-keychain for secure storage');
        return;
      }
    } catch (error) {
      console.warn('[ReactNativeSecureStorage] react-native-keychain not available');
    }

    // Fallback to AsyncStorage with encryption warning
    try {
      const AsyncStorageModule = require('@react-native-async-storage/async-storage');
      if (AsyncStorageModule && AsyncStorageModule.default) {
        this.asyncStorage = AsyncStorageModule.default;
        this.useEncryption = true; // Flag that we should warn about encryption
        console.warn('[ReactNativeSecureStorage] Using AsyncStorage - data is not hardware-encrypted. Consider installing react-native-keychain for better security.');
        return;
      }
    } catch (error) {
      console.warn('[ReactNativeSecureStorage] AsyncStorage not available');
    }

    throw new Error('No storage backend available. Please install react-native-keychain or @react-native-async-storage/async-storage');
  }

  async saveSession(session: Session): Promise<void> {
    try {
      const sessionData = JSON.stringify(session);
      
      if (this.keychain) {
        await this.keychain.setItem(this.service, this.username, sessionData, {
          accessControl: 'BiometryAny', // Use biometry if available
          authenticatePrompt: 'Authenticate to save Phantom wallet session',
          accessGroup: undefined, // Use default keychain access group
        });
      } else if (this.asyncStorage) {
        // Simple base64 encoding for basic obfuscation (not real encryption)
        const encodedData = this.useEncryption ? this.simpleEncode(sessionData) : sessionData;
        await this.asyncStorage.setItem(this.sessionKey, encodedData);
      } else {
        throw new Error('No storage backend available');
      }
    } catch (error) {
      console.error('[ReactNativeSecureStorage] Failed to save session', { error: (error as Error).message });
      throw new Error(`Failed to save session: ${(error as Error).message}`);
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      let sessionData: string | null = null;
      
      if (this.keychain) {
        try {
          sessionData = await this.keychain.getItem(this.service, this.username, {
            authenticatePrompt: 'Authenticate to access Phantom wallet session',
          });
        } catch (error) {
          // Keychain might not have the item or user cancelled auth
          console.log('[ReactNativeSecureStorage] Could not retrieve from keychain', (error as Error).message);
          return null;
        }
      } else if (this.asyncStorage) {
        const storedData = await this.asyncStorage.getItem(this.sessionKey);
        if (storedData) {
          sessionData = this.useEncryption ? this.simpleDecode(storedData) : storedData;
        }
      } else {
        throw new Error('No storage backend available');
      }
      
      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData) as Session;
    } catch (error) {
      console.error('[ReactNativeSecureStorage] Failed to load session', { error: (error as Error).message });
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      if (this.keychain) {
        await this.keychain.removeItem(this.service, this.username);
      } else if (this.asyncStorage) {
        await this.asyncStorage.removeItem(this.sessionKey);
      }
    } catch (error) {
      console.error('[ReactNativeSecureStorage] Failed to clear session', { error: (error as Error).message });
      // Don't throw here, clearing should be resilient
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.keychain || this.asyncStorage);
  }

  // Simple encoding/decoding for AsyncStorage (NOT secure encryption)
  private simpleEncode(data: string): string {
    // Simple base64 encoding using btoa/atob or manual implementation
    try {
      return btoa(data);
    } catch (error) {
      // Manual base64 encoding for React Native environments that don't have btoa
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      while (i < data.length) {
        const a = data.charCodeAt(i++);
        const b = i < data.length ? data.charCodeAt(i++) : 0;
        const c = i < data.length ? data.charCodeAt(i++) : 0;
        const bitmap = (a << 16) | (b << 8) | c;
        result += chars.charAt((bitmap >> 18) & 63) +
                  chars.charAt((bitmap >> 12) & 63) +
                  (i - 2 < data.length ? chars.charAt((bitmap >> 6) & 63) : '=') +
                  (i - 1 < data.length ? chars.charAt(bitmap & 63) : '=');
      }
      return result;
    }
  }

  private simpleDecode(encodedData: string): string {
    try {
      return atob(encodedData);
    } catch (error) {
      // Manual base64 decoding for React Native environments that don't have atob
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      while (i < encodedData.length) {
        const encoded1 = chars.indexOf(encodedData.charAt(i++));
        const encoded2 = chars.indexOf(encodedData.charAt(i++));
        const encoded3 = chars.indexOf(encodedData.charAt(i++));
        const encoded4 = chars.indexOf(encodedData.charAt(i++));
        const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
        result += String.fromCharCode((bitmap >> 16) & 255);
        if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
        if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
      }
      return result;
    }
  }

  // Get info about the storage backend being used
  getStorageInfo(): { type: 'keychain' | 'asyncstorage' | 'none'; isSecure: boolean } {
    if (this.keychain) {
      return { type: 'keychain', isSecure: true };
    } else if (this.asyncStorage) {
      return { type: 'asyncstorage', isSecure: false };
    } else {
      return { type: 'none', isSecure: false };
    }
  }
}