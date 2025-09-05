export interface DeeplinksSession {
  sessionToken?: string;
  publicKey?: string;
  // No keyPair or sharedSecret - these are handled by SecureCrypto
}

export interface DeeplinksSessionStorage {
  publicKey?: string;
  sessionToken?: string;
  phantomEncryptionPublicKey?: string; // Store Phantom's public key to regenerate shared secret
  // Note: keyPair is NOT stored in localStorage - it's in IndexedDB
}

const SESSION_STORAGE_KEY = "phantom-deeplinks-session";

/**
 * Initialize session storage
 */
export function initializeSessionStorage(): void {
  // eslint-disable-next-line no-console
  console.log("💾 STORAGE: Session storage initialized");
  // SecureCrypto will be initialized separately
}

/**
 * Save session data (no private keys stored)
 */
export function saveSession(session: DeeplinksSession, phantomEncryptionPublicKey?: string): void {
  try {
    // Store only non-sensitive data in localStorage
    const sessionData: DeeplinksSessionStorage = {
      publicKey: session.publicKey,
      sessionToken: session.sessionToken,
      phantomEncryptionPublicKey,
    };
    
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    
    // eslint-disable-next-line no-console
    console.log("💾 STORAGE: Saved session data to localStorage (no private keys)");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("💾 STORAGE: Failed to save session:", error);
    throw error;
  }
}

/**
 * Load session data (no private keys involved)
 * Returns the full stored session data including phantomEncryptionPublicKey
 */
export function loadSession(): DeeplinksSessionStorage | null {
  try {
    // Load non-sensitive session data from localStorage
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      // eslint-disable-next-line no-console
      console.log("💾 STORAGE: No session data in localStorage");
      return null;
    }
    
    const sessionData: DeeplinksSessionStorage = JSON.parse(stored);
    
    // eslint-disable-next-line no-console
    console.log("💾 STORAGE: Loaded session from localStorage", { 
      hasSessionToken: !!sessionData.sessionToken,
      hasPublicKey: !!sessionData.publicKey,
      hasPhantomKey: !!sessionData.phantomEncryptionPublicKey
    });
    
    return sessionData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("💾 STORAGE: Failed to load session:", error);
    return null;
  }
}

/**
 * Clear session data from localStorage
 * Note: SecureCrypto keys should be cleared separately via secureCrypto.clear()
 */
export function clearSession(): void {
  try {
    // Clear non-sensitive data from localStorage
    localStorage.removeItem(SESSION_STORAGE_KEY);
    
    // eslint-disable-next-line no-console
    console.log("💾 STORAGE: Cleared session data from localStorage");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("💾 STORAGE: Failed to clear deeplinks session:", error);
    throw error;
  }
}

/**
 * Check if we have a valid session
 */
export function hasValidSession(session: DeeplinksSession | DeeplinksSessionStorage | null): boolean {
  return !!(session?.sessionToken && session?.publicKey);
}

