import type { KeyPair } from "./crypto";
import { initializeCryptoStorage, getOrCreateKeypair, clearStoredKeyPair } from "./crypto";

export interface DeeplinksSession {
  sessionToken?: string;
  publicKey?: string;
  keyPair: KeyPair;
  sharedSecret?: Uint8Array;
}

export interface DeeplinksSessionStorage {
  publicKey?: string;
  sessionToken?: string;
  phantomEncryptionPublicKey?: string; // Store Phantom's public key to regenerate shared secret
  // Note: keyPair is NOT stored in localStorage - it's in IndexedDB
}

const SESSION_STORAGE_KEY = "phantom-deeplinks-session";

/**
 * Initialize session storage - sets up IndexedDB for secure key storage
 */
export async function initializeSessionStorage(): Promise<void> {
  try {
    await initializeCryptoStorage();
    // eslint-disable-next-line no-console
    console.log("💾 STORAGE: IndexedDB crypto storage initialized");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("💾 STORAGE: Failed to initialize crypto storage:", error);
    throw error;
  }
}

/**
 * Save session with secure key storage
 * Note: keyPair is stored securely in IndexedDB via crypto.ts, only non-sensitive data goes to localStorage
 */
export async function saveSession(session: DeeplinksSession, phantomEncryptionPublicKey?: string): Promise<void> {
  try {
    // Store only non-sensitive data in localStorage
    const sessionData: DeeplinksSessionStorage = {
      publicKey: session.publicKey,
      sessionToken: session.sessionToken,
      phantomEncryptionPublicKey,
    };
    
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    
    // The keyPair is already stored securely in IndexedDB via crypto operations
    // The sharedSecret will be regenerated when needed from stored keyPair + Phantom's key
    
    // eslint-disable-next-line no-console
    console.log("💾 STORAGE: Saved session data to localStorage (no private keys)");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("💾 STORAGE: Failed to save session:", error);
    throw error;
  }
}

/**
 * Load session with secure key retrieval
 * Loads session data from localStorage and keypair from secure IndexedDB storage
 */
export async function loadSession(): Promise<DeeplinksSession | null> {
  try {
    // Load non-sensitive session data from localStorage
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      // eslint-disable-next-line no-console
      console.log("💾 STORAGE: No session data in localStorage");
      return null;
    }
    
    const sessionData: DeeplinksSessionStorage = JSON.parse(stored);
    
    // Load keypair from secure IndexedDB storage
    const keyPair = await getOrCreateKeypair();
    
    // Regenerate shared secret if we have Phantom's public key
    let sharedSecret: Uint8Array | undefined;
    if (sessionData.phantomEncryptionPublicKey) {
      const { base58ToPublicKey, createSharedSecret } = await import("./crypto");
      const phantomPublicKey = base58ToPublicKey(sessionData.phantomEncryptionPublicKey);
      sharedSecret = createSharedSecret(keyPair.secretKey, phantomPublicKey);
      
      // eslint-disable-next-line no-console
      console.log("💾 STORAGE: Regenerated shared secret from stored keys");
    }
    
    // eslint-disable-next-line no-console
    console.log("💾 STORAGE: Loaded session from localStorage + IndexedDB");
    
    return {
      sessionToken: sessionData.sessionToken,
      publicKey: sessionData.publicKey,
      keyPair,
      sharedSecret,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("💾 STORAGE: Failed to load session:", error);
    return null;
  }
}

/**
 * Clear session from both IndexedDB and localStorage
 */
export async function clearSession(): Promise<void> {
  try {
    // Clear non-sensitive data from localStorage
    localStorage.removeItem(SESSION_STORAGE_KEY);
    
    // Clear keypair from secure IndexedDB storage
    await clearStoredKeyPair();
    
    // eslint-disable-next-line no-console
    console.log("💾 STORAGE: Cleared session data from localStorage + IndexedDB");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("💾 STORAGE: Failed to clear deeplinks session:", error);
    throw error;
  }
}

/**
 * Check if we have a valid session
 */
export function hasValidSession(session: DeeplinksSession | null): boolean {
  return !!(session?.sessionToken && session?.publicKey && session?.sharedSecret);
}

