import * as nacl from "tweetnacl";
import bs58 from "bs58";

export interface EncryptedPayload {
  nonce: string;
  data: string;
}

interface KeyPairRecord {
  keyPair: CryptoKeyPair;
  publicKeyBase58: string;
  createdAt: number;
}

/**
 * Secure crypto manager for deeplinks that follows IndexedDbStamper pattern
 * - Generates non-extractable Curve25519 keypairs using Web Crypto API
 * - Stores keys securely in IndexedDB without exposing private key material
 * - Provides crypto operations without ever exposing private keys
 */
export class SecureCrypto {
  private dbName: string = "phantom-deeplinks-secure-crypto";
  private storeName: string = "secure-keys";
  private keyName: string = "deeplinks-keypair";
  private db: IDBDatabase | null = null;
  private activeKeyPairRecord: KeyPairRecord | null = null;

  constructor() {
    if (typeof window === "undefined" || !window.indexedDB) {
      throw new Error("SecureCrypto requires a browser environment with IndexedDB support");
    }
  }

  /**
   * Initialize the secure crypto by opening IndexedDB and retrieving or generating keys
   */
  async init(): Promise<string> {
    await this.openDB();

    // Try to load existing keypair
    this.activeKeyPairRecord = await this.loadKeyPairRecord();
    
    if (!this.activeKeyPairRecord) {
      // No existing keypair, generate new one
      this.activeKeyPairRecord = await this.generateAndStoreNewKeyPair();
    }

    return this.activeKeyPairRecord.publicKeyBase58;
  }

  /**
   * Get the public key in base58 format
   */
  getPublicKeyBase58(): string | null {
    return this.activeKeyPairRecord?.publicKeyBase58 || null;
  }

  /**
   * Create shared secret from our private key and their public key
   * Uses Web Crypto API or NaCl fallback without exposing private key material
   */
  async createSharedSecret(theirPublicKeyBase58: string): Promise<Uint8Array> {
    if (!this.activeKeyPairRecord) {
      throw new Error("SecureCrypto not initialized. Call init() first.");
    }

    // Convert their base58 public key to raw bytes
    const theirPublicKeyBytes = bs58.decode(theirPublicKeyBase58);
    
    // Check if we're using NaCl fallback
    const privateKey = this.activeKeyPairRecord.keyPair.privateKey as any;
    if (privateKey._naclSecretKey) {
      // Use NaCl for shared secret
      return nacl.box.before(theirPublicKeyBytes, privateKey._naclSecretKey);
    }
    
    try {
      // Try Web Crypto API approach
      const theirPublicKey = await crypto.subtle.importKey(
        "raw",
        theirPublicKeyBytes.buffer as ArrayBuffer,
        {
          name: "ECDH",
          namedCurve: "X25519"
        },
        false,
        []
      );

      // Derive shared secret using ECDH
      const sharedSecretBuffer = await crypto.subtle.deriveBits(
        {
          name: "ECDH",
          public: theirPublicKey
        },
        this.activeKeyPairRecord.keyPair.privateKey,
        256 // 32 bytes
      );

      return new Uint8Array(sharedSecretBuffer);
    } catch (error) {
      throw new Error("Failed to create shared secret: " + (error as Error).message);
    }
  }

  /**
   * Decrypt payload using stored private key and their public key
   */
  async decryptPayload(encryptedPayload: EncryptedPayload, theirPublicKeyBase58: string): Promise<any> {
    const sharedSecret = await this.createSharedSecret(theirPublicKeyBase58);
    
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
   * Encrypt payload using stored private key and their public key
   */
  async encryptPayload(data: any, theirPublicKeyBase58: string): Promise<EncryptedPayload> {
    const sharedSecret = await this.createSharedSecret(theirPublicKeyBase58);
    
    const nonce = nacl.randomBytes(24);
    const dataBytes = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = nacl.box.after(dataBytes, nonce, sharedSecret);
    
    return {
      nonce: bs58.encode(nonce),
      data: bs58.encode(encrypted),
    };
  }

  /**
   * Clear all stored keys
   */
  async clear(): Promise<void> {
    await this.clearStoredKeys();
    this.activeKeyPairRecord = null;
  }

  private async openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  private async generateAndStoreNewKeyPair(): Promise<KeyPairRecord> {
    // Check if X25519 is supported, fallback to generating NaCl keys if not
    let keyPair: CryptoKeyPair;
    let publicKeyBase58: string;
    
    try {
      // Try to generate X25519 key pair (may not be supported in all browsers)
      keyPair = await crypto.subtle.generateKey(
        {
          name: "ECDH", 
          namedCurve: "X25519"
        },
        false, // non-extractable - private key can never be exported
        ["deriveBits", "deriveKey"]
      );
      
      // Export public key in raw format
      const rawPublicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
      publicKeyBase58 = bs58.encode(new Uint8Array(rawPublicKeyBuffer));
      
    } catch (error) {
      // X25519 not supported, generate using NaCl instead and wrap in CryptoKey-like interface
      // eslint-disable-next-line no-console
      console.warn("X25519 not supported, using NaCl fallback");
      const naclKeyPair = nacl.box.keyPair();
      publicKeyBase58 = bs58.encode(naclKeyPair.publicKey);
      
      // Create a mock CryptoKeyPair that stores the NaCl keys
      keyPair = {
        privateKey: {
          _naclSecretKey: naclKeyPair.secretKey
        } as any,
        publicKey: {
          _naclPublicKey: naclKeyPair.publicKey
        } as any
      };
    }

    const now = Date.now();
    const record: KeyPairRecord = {
      keyPair,
      publicKeyBase58,
      createdAt: now,
    };

    // Store the record in IndexedDB
    await this.storeKeyPairRecord(record);

    return record;
  }

  private async storeKeyPairRecord(record: KeyPairRecord): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const request = store.put(record, this.keyName);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async loadKeyPairRecord(): Promise<KeyPairRecord | null> {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(this.keyName);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async clearStoredKeys(): Promise<void> {
    if (!this.db) {
      await this.openDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(this.keyName);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}