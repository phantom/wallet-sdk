import { base64urlEncode } from "@phantom/base64url";
import type { Buffer } from "buffer";
import bs58 from "bs58";
import { type StamperWithKeyManagement, type StamperKeyInfo, Algorithm } from "@phantom/sdk-types";

export type IndexedDbStamperConfig = {
  dbName?: string;
  storeName?: string;
  keyName?: string;
};

/**
 * IndexedDB-based key manager that stores cryptographic keys securely in IndexedDB
 * and performs signing operations without ever exposing private key material.
 *
 * Security model:
 * - Generates non-extractable Ed25519 keypairs using Web Crypto API
 * - Stores keys entirely within Web Crypto API secure context
 * - Private keys NEVER exist in JavaScript memory
 * - Provides signing methods without exposing private keys
 * - Maximum security using browser's native cryptographic isolation
 */
export class IndexedDbStamper implements StamperWithKeyManagement {
  private dbName: string;
  private storeName: string;
  private keyName: string;
  private db: IDBDatabase | null = null;
  private keyInfo: StamperKeyInfo | null = null;
  private cryptoKeyPair: CryptoKeyPair | null = null;
  algorithm = Algorithm.ed25519; // Use Ed25519 for maximum security and performance

  constructor(config: IndexedDbStamperConfig = {}) {
    if (typeof window === "undefined" || !window.indexedDB) {
      throw new Error("IndexedDbStamper requires a browser environment with IndexedDB support");
    }

    this.dbName = config.dbName || "phantom-indexed-db-stamper";
    this.storeName = config.storeName || "crypto-keys";
    this.keyName = config.keyName || "signing-key";
  }

  /**
   * Initialize the stamper by opening IndexedDB and retrieving or generating keys
   */
  async init(): Promise<StamperKeyInfo> {
    await this.openDB();

    let keyInfo = await this.getStoredKeyInfo();
    if (!keyInfo) {
      keyInfo = await this.generateAndStoreKeyPair();
    } else {
      // Load existing key pair
      await this.loadKeyPair();
    }

    this.keyInfo = keyInfo;
    return keyInfo;
  }

  /**
   * Get the public key information
   */
  getKeyInfo(): StamperKeyInfo | null {
    return this.keyInfo;
  }

  /**
   * Reset the key pair by generating a new one
   */
  async resetKeyPair(): Promise<StamperKeyInfo> {
    await this.clearStoredKeys();
    const keyInfo = await this.generateAndStoreKeyPair();
    this.keyInfo = keyInfo;
    return keyInfo;
  }

  /**
   * Create X-Phantom-Stamp header value using stored private key
   * @param params - Parameters object with data and optional type/options
   * @returns Complete X-Phantom-Stamp header value
   */
  async stamp(
    params:
      | {
          data: Buffer;
          type?: "PKI";
          idToken?: never;
          salt?: never;
        }
      | {
          data: Buffer;
          type: "OIDC";
          idToken: string;
          salt: string;
        },
  ): Promise<string> {
    const { data, type = "PKI" } = params;
    if (!this.keyInfo || !this.cryptoKeyPair) {
      throw new Error("Stamper not initialized. Call init() first.");
    }

    // Convert Buffer to Uint8Array
    const dataBytes = new Uint8Array(data);

    // Sign using Web Crypto API with non-extractable private key
    const signature = await crypto.subtle.sign(
      {
        name: this.algorithm,
        hash: "SHA-256",
      },
      this.cryptoKeyPair.privateKey,
      dataBytes as BufferSource,
    );

    const signatureBase64url = base64urlEncode(new Uint8Array(signature));

    // Create the stamp structure
    const stampData =
      type === "PKI"
        ? {
            // Decode base58 public key to bytes, then encode as base64url (consistent with ApiKeyStamper)
            publicKey: base64urlEncode(bs58.decode(this.keyInfo.publicKey)),
            signature: signatureBase64url,
            kind: "PKI" as const,
            algorithm: this.algorithm,
          }
        : {
            kind: "OIDC",
            idToken: (params as any).idToken,
            publicKey: base64urlEncode(bs58.decode(this.keyInfo.publicKey)),
            salt: (params as any).salt,
            algorithm: this.algorithm,
            signature: signatureBase64url,
          };

    // Encode the entire stamp as base64url JSON
    const stampJson = JSON.stringify(stampData);
    return base64urlEncode(stampJson);
  }

  /**
   * Clear all stored keys
   */
  async clear(): Promise<void> {
    await this.clearStoredKeys();
    this.keyInfo = null;
    this.cryptoKeyPair = null;
  }

  private async clearStoredKeys(): Promise<void> {
    if (!this.db) {
      await this.openDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      // Clear specific keys for this stamper instance
      const deleteKeyPair = store.delete(`${this.keyName}-keypair`);
      const deleteKeyInfo = store.delete(`${this.keyName}-info`);

      let completed = 0;
      const total = 2;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      deleteKeyPair.onsuccess = checkComplete;
      deleteKeyInfo.onsuccess = checkComplete;

      deleteKeyPair.onerror = () => reject(deleteKeyPair.error);
      deleteKeyInfo.onerror = () => reject(deleteKeyInfo.error);
    });
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

  private async generateAndStoreKeyPair(): Promise<StamperKeyInfo> {
    // Generate non-extractable Ed25519 key pair using Web Crypto API
    this.cryptoKeyPair = await crypto.subtle.generateKey(
      {
        name: "Ed25519",
      },
      false, // non-extractable - private key can never be exported
      ["sign", "verify"],
    );

    // Export public key in raw format (no ASN.1/DER wrapper)
    const rawPublicKeyBuffer = await crypto.subtle.exportKey("raw", this.cryptoKeyPair.publicKey);
    // Store raw public key as base58 (consistent with other stampers)
    const publicKeyBase58 = bs58.encode(new Uint8Array(rawPublicKeyBuffer));

    // Create a deterministic key ID from the raw public key
    const keyIdBuffer = await crypto.subtle.digest("SHA-256", rawPublicKeyBuffer);
    const keyId = base64urlEncode(new Uint8Array(keyIdBuffer)).substring(0, 16);

    const keyInfo: StamperKeyInfo = {
      keyId,
      publicKey: publicKeyBase58,
    };

    // Store the non-extractable key pair and info in IndexedDB
    await this.storeKeyPair(this.cryptoKeyPair, keyInfo);

    return keyInfo;
  }

  private async storeKeyPair(keyPair: CryptoKeyPair, keyInfo: StamperKeyInfo): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      // Store the non-extractable key pair
      const keyPairRequest = store.put(keyPair, `${this.keyName}-keypair`);
      // Store key info
      const keyInfoRequest = store.put(keyInfo, `${this.keyName}-info`);

      let completed = 0;
      const total = 2;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      keyPairRequest.onsuccess = checkComplete;
      keyInfoRequest.onsuccess = checkComplete;

      keyPairRequest.onerror = () => reject(keyPairRequest.error);
      keyInfoRequest.onerror = () => reject(keyInfoRequest.error);
    });
  }

  private async loadKeyPair(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(`${this.keyName}-keypair`);

      request.onsuccess = () => {
        this.cryptoKeyPair = request.result || null;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getStoredKeyInfo(): Promise<StamperKeyInfo | null> {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(`${this.keyName}-info`);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
}
