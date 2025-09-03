import * as nacl from "tweetnacl";
import bs58 from "bs58";

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface EncryptedPayload {
  nonce: string;
  data: string;
}

// IndexedDB configuration for secure key storage
const DB_NAME = "phantom-deeplinks-crypto";
const STORE_NAME = "encryption-keys";
const KEY_NAME = "deeplinks-keypair";

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB for secure key storage
 */
export async function initializeCryptoStorage(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("IndexedDB not available");
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Generate and securely store a new encryption keypair
 */
export async function generateAndStoreKeypair(): Promise<KeyPair> {
  const keyPair = nacl.box.keyPair();
  await storeKeyPair(keyPair);
  return keyPair;
}

/**
 * Store keypair securely in IndexedDB
 */
export async function storeKeyPair(keyPair: KeyPair): Promise<void> {
  if (!db) {
    await initializeCryptoStorage();
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    // Store as arrays to make them serializable
    const serializable = {
      publicKey: Array.from(keyPair.publicKey),
      secretKey: Array.from(keyPair.secretKey),
      createdAt: Date.now()
    };
    
    const request = store.put(serializable, KEY_NAME);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load keypair from IndexedDB
 */
export async function loadStoredKeyPair(): Promise<KeyPair | null> {
  if (!db) {
    await initializeCryptoStorage();
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY_NAME);

    request.onsuccess = () => {
      const result = request.result;
      if (!result || !result.publicKey || !result.secretKey) {
        resolve(null);
        return;
      }
      
      resolve({
        publicKey: new Uint8Array(result.publicKey),
        secretKey: new Uint8Array(result.secretKey)
      });
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear stored keypair from IndexedDB
 */
export async function clearStoredKeyPair(): Promise<void> {
  if (!db) {
    await initializeCryptoStorage();
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(KEY_NAME);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate or load existing keypair from secure storage
 */
export async function getOrCreateKeypair(): Promise<KeyPair> {
  try {
    const existing = await loadStoredKeyPair();
    if (existing) {
      return existing;
    }
  } catch (error) {
    console.warn("Failed to load existing keypair:", error);
  }
  
  // Generate new keypair if none exists
  return await generateAndStoreKeypair();
}

/**
 * Generate a new encryption keypair (fallback for non-persistent scenarios)
 */
export function generateKeypair(): KeyPair {
  return nacl.box.keyPair();
}

/**
 * Encrypt data for sending to Phantom via deeplinks
 */
export function encryptPayload(
  data: any,
  sharedSecret: Uint8Array,
): EncryptedPayload {
  const nonce = nacl.randomBytes(24);
  const dataBytes = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = nacl.box.after(dataBytes, nonce, sharedSecret);
  
  return {
    nonce: bs58.encode(nonce),
    data: bs58.encode(encrypted),
  };
}

/**
 * Decrypt response from Phantom
 */
export function decryptPayload(
  encryptedPayload: EncryptedPayload,
  sharedSecret: Uint8Array,
): any {
  const nonce = bs58.decode(encryptedPayload.nonce);
  const data = bs58.decode(encryptedPayload.data);
  
  const decrypted = nacl.box.open.after(data, nonce, sharedSecret);
  if (!decrypted) {
    throw new Error("Failed to decrypt payload");
  }
  
  const decryptedString = new TextDecoder().decode(decrypted);
  return JSON.parse(decryptedString);
}

/**
 * Create shared secret from our private key and Phantom's public key
 */
export function createSharedSecret(
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array,
): Uint8Array {
  return nacl.box.before(theirPublicKey, ourSecretKey);
}

/**
 * Convert public key to base58 string for URL transmission
 */
export function publicKeyToBase58(publicKey: Uint8Array): string {
  return bs58.encode(publicKey);
}

/**
 * Convert base58 string back to public key bytes
 */
export function base58ToPublicKey(base58Key: string): Uint8Array {
  return bs58.decode(base58Key);
}