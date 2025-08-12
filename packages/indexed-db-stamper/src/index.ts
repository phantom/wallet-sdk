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
 * - Generates non-extractable ECDSA P-256 (secp256r1) keypairs using Web Crypto API
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
  algorithm = Algorithm.secp256r1; // Use ECDSA P-256 (secp256r1) for maximum browser compatibility

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
  async stamp(params: {
    data: Buffer;
    type?: 'PKI';
    idToken?: never;
    salt?: never;
  } | {
    data: Buffer;
    type: 'OIDC';
    idToken: string;
    salt: string;
  }): Promise<string> {
    const { data, type = "PKI" } = params;
    if (!this.keyInfo || !this.cryptoKeyPair) {
      throw new Error("Stamper not initialized. Call init() first.");
    }

    // Convert Buffer to Uint8Array
    const dataBytes = new Uint8Array(data);

    // Sign using Web Crypto API with non-extractable private key
    const signature = await crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      this.cryptoKeyPair.privateKey,
      dataBytes as BufferSource
    );

    // Convert IEEE P1363 signature to DER format
    const derSignature = this.convertP1363ToDer(new Uint8Array(signature));
    const signatureBase64url = base64urlEncode(derSignature);
    
    // Create the stamp structure
    const stampData = type === "PKI" ?  {
      // Decode base58 public key to bytes, then encode as base64url (consistent with ApiKeyStamper)
      publicKey: base64urlEncode(bs58.decode(this.keyInfo.publicKey)),
      signature: signatureBase64url,
      kind: "PKI" as const,
      algorithm: this.algorithm,
    } :  {
      kind: "OIDC",
      idToken: (params as any).idToken,
      publicKey: base64urlEncode(bs58.decode(this.keyInfo.publicKey)),
      salt: (params as any).salt,
      algorithm: this.algorithm,
      signature: signatureBase64url
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

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  private async generateAndStoreKeyPair(): Promise<StamperKeyInfo> {
    // Generate non-extractable ECDSA P-256 key pair using Web Crypto API
    this.cryptoKeyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false, // non-extractable - private key can never be exported
      ["sign", "verify"]
    );

    // Export public key for storage and API use
    const publicKeyBuffer = await crypto.subtle.exportKey("spki", this.cryptoKeyPair.publicKey);
    
    // For ECDSA P-256, we need to extract the raw public key from SPKI format
    // SPKI format has metadata, but we want just the raw key like Ed25519
    const rawPublicKey = this.extractRawPublicKeyFromSPKI(new Uint8Array(publicKeyBuffer));
    
    // Store raw public key as base58 (consistent with other stampers)
    const publicKeyBase58 = bs58.encode(rawPublicKey);
    
    // Create a deterministic key ID from the full SPKI buffer
    const keyIdBuffer = await crypto.subtle.digest("SHA-256", publicKeyBuffer);
    const keyId = base64urlEncode(new Uint8Array(keyIdBuffer)).substring(0, 16);

    const keyInfo: StamperKeyInfo = {
      keyId,
      publicKey: publicKeyBase58,
    };

    // Store the non-extractable key pair and info in IndexedDB
    await this.storeKeyPair(this.cryptoKeyPair, keyInfo);

    return keyInfo;
  }

  /**
   * Convert IEEE P1363 signature format to DER format
   * Web Crypto API returns signatures in IEEE P1363 format (r||s)
   * but many systems expect DER format
   */
  private convertP1363ToDer(p1363Signature: Uint8Array): Uint8Array {
    // For P-256, signature is 64 bytes: 32 bytes r + 32 bytes s
    if (p1363Signature.length !== 64) {
      throw new Error("Invalid P1363 signature length for P-256");
    }

    const r = p1363Signature.slice(0, 32);
    const s = p1363Signature.slice(32, 64);

    // Helper to encode integer for DER
    const encodeInteger = (bytes: Uint8Array): Uint8Array => {
      // Remove leading zeros, but keep at least one byte
      let start = 0;
      while (start < bytes.length - 1 && bytes[start] === 0) {
        start++;
      }
      const trimmed = bytes.slice(start);
      
      // If high bit is set, prepend 0x00 to indicate positive number
      const needsPadding = (trimmed[0] & 0x80) !== 0;
      const padded = needsPadding ? new Uint8Array([0, ...trimmed]) : trimmed;
      
      // DER integer: 0x02 (INTEGER) + length + data
      const result = new Uint8Array(2 + padded.length);
      result[0] = 0x02; // INTEGER tag
      result[1] = padded.length; // length
      result.set(padded, 2); // data
      
      return result;
    };

    const rDer = encodeInteger(r);
    const sDer = encodeInteger(s);
    
    // DER sequence: 0x30 (SEQUENCE) + length + rDer + sDer
    const contentLength = rDer.length + sDer.length;
    const result = new Uint8Array(2 + contentLength);
    result[0] = 0x30; // SEQUENCE tag
    result[1] = contentLength; // length
    result.set(rDer, 2);
    result.set(sDer, 2 + rDer.length);
    
    return result;
  }

  /**
   * Extract raw public key bytes from SPKI format
   * For ECDSA P-256, the raw public key is at the end of the SPKI structure
   */
  private extractRawPublicKeyFromSPKI(spkiBytes: Uint8Array): Uint8Array {
    // For ECDSA P-256 SPKI, the raw public key (65 bytes) is at the end
    // Format: 0x04 (uncompressed) + 32 bytes (x) + 32 bytes (y)
    if (spkiBytes.length < 65) {
      throw new Error("Invalid SPKI format: too short for P-256 public key");
    }
    
    // Extract the last 65 bytes which contain the raw public key
    return spkiBytes.slice(-65);
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