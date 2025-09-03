import { base64urlEncode } from "@phantom/base64url";
import type { Buffer } from "buffer";
import bs58 from "bs58";
import { type StamperWithKeyManagement, type StamperKeyInfo, Algorithm } from "@phantom/sdk-types";

interface KeyPairRecord {
  keyPair: CryptoKeyPair;
  keyInfo: StamperKeyInfo;
  createdAt: number;
  expiresAt: number;
  authenticatorId?: string;
  status: "active" | "pending" | "expired";
}

export type IndexedDbStamperConfig = {
  dbName?: string;
  storeName?: string;
  keyName?: string;
  type?: "PKI" | "OIDC"; // Defaults to "PKI"
  idToken?: string; // Required for OIDC type, optional for PKI
  salt?: string; // Required for OIDC type, optional for PKI
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
  private activeKeyPairRecord: KeyPairRecord | null = null;
  private pendingKeyPairRecord: KeyPairRecord | null = null;
  algorithm = Algorithm.ed25519; // Use Ed25519 for maximum security and performance

  // The type of stamper, can be changed at any time
  public type: "PKI" | "OIDC" = "PKI"; // Default to PKI, can be set to OIDC if needed
  public idToken?: string; // Optional for PKI, required for OIDC
  public salt?: string; // Optional for PKI, required for OIDC

  constructor(config: IndexedDbStamperConfig = {}) {
    if (typeof window === "undefined" || !window.indexedDB) {
      throw new Error("IndexedDbStamper requires a browser environment with IndexedDB support");
    }

    this.dbName = config.dbName || "phantom-indexed-db-stamper";
    this.storeName = config.storeName || "crypto-keys";
    this.keyName = config.keyName || "signing-key";
    this.type = config.type || "PKI";
    this.idToken = config.idToken;
    this.salt = config.salt;
  }

  /**
   * Initialize the stamper by opening IndexedDB and retrieving or generating keys
   */
  async init(): Promise<StamperKeyInfo> {
    await this.openDB();

    // Try to load existing active keypair
    this.activeKeyPairRecord = await this.loadActiveKeyPairRecord();

    if (!this.activeKeyPairRecord) {
      // No existing keypair, generate new one
      this.activeKeyPairRecord = await this.generateAndStoreNewKeyPair("active");
    }

    // Check if there's a pending keypair from a previous rotation
    this.pendingKeyPairRecord = await this.loadPendingKeyPairRecord();

    return this.activeKeyPairRecord.keyInfo;
  }

  /**
   * Get the public key information
   */
  getKeyInfo(): StamperKeyInfo | null {
    return this.activeKeyPairRecord?.keyInfo || null;
  }

  /**
   * Reset the key pair by generating a new one
   */
  async resetKeyPair(): Promise<StamperKeyInfo> {
    await this.clearStoredKeys();
    this.activeKeyPairRecord = await this.generateAndStoreNewKeyPair("active");
    this.pendingKeyPairRecord = null;
    return this.activeKeyPairRecord.keyInfo;
  }

  /**
   * Create X-Phantom-Stamp header value using stored private key
   * @param params - Parameters object with data and optional type/options
   * @returns Complete X-Phantom-Stamp header value
   */
  async stamp(
    params:
      | { data: Buffer; type?: "PKI"; idToken?: never; salt?: never }
      | { data: Buffer; type: "OIDC"; idToken: string; salt: string },
  ): Promise<string> {
    const { data } = params;
    if (!this.activeKeyPairRecord) {
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
      this.activeKeyPairRecord.keyPair.privateKey,
      dataBytes as BufferSource,
    );

    const signatureBase64url = base64urlEncode(new Uint8Array(signature));

    // Determine stamp type - use override parameter if provided, otherwise use instance type
    const stampType = params.type || this.type;

    // Get OIDC parameters from override or instance properties
    const idToken = params.type === "OIDC" ? params.idToken : this.idToken;
    const salt = params.type === "OIDC" ? params.salt : this.salt;

    // Create the stamp structure
    const stampData =
      stampType === "PKI"
        ? {
            // Decode base58 public key to bytes, then encode as base64url (consistent with ApiKeyStamper)
            publicKey: base64urlEncode(bs58.decode(this.activeKeyPairRecord.keyInfo.publicKey)),
            signature: signatureBase64url,
            kind: "PKI",
            algorithm: this.algorithm,
          }
        : {
            kind: "OIDC",
            idToken,
            publicKey: base64urlEncode(bs58.decode(this.activeKeyPairRecord.keyInfo.publicKey)),
            salt,
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
    this.activeKeyPairRecord = null;
    this.pendingKeyPairRecord = null;
  }

  private async clearStoredKeys(): Promise<void> {
    if (!this.db) {
      await this.openDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      // Clear both active and pending keys
      const deleteActiveKeyPair = store.delete(`${this.keyName}-active`);
      const deletePendingKeyPair = store.delete(`${this.keyName}-pending`);

      let completed = 0;
      const total = 2;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      deleteActiveKeyPair.onsuccess = checkComplete;
      deletePendingKeyPair.onsuccess = checkComplete;

      deleteActiveKeyPair.onerror = () => reject(deleteActiveKeyPair.error);
      deletePendingKeyPair.onerror = () => reject(deletePendingKeyPair.error);
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

  /**
   * Generate a new keypair for rotation without making it active
   */
  async rotateKeyPair(): Promise<StamperKeyInfo> {
    if (!this.db) {
      await this.openDB();
    }

    this.pendingKeyPairRecord = await this.generateAndStoreNewKeyPair("pending");
    return this.pendingKeyPairRecord.keyInfo;
  }

  /**
   * Switch to the pending keypair, making it active and cleaning up the old one
   */
  async commitRotation(authenticatorId: string): Promise<void> {
    if (!this.pendingKeyPairRecord) {
      throw new Error("No pending keypair to commit");
    }

    // Remove old active keypair
    if (this.activeKeyPairRecord) {
      await this.removeKeyPairRecord("active");
    }

    // Promote pending to active
    this.pendingKeyPairRecord.status = "active";
    this.pendingKeyPairRecord.authenticatorId = authenticatorId;
    this.pendingKeyPairRecord.keyInfo.authenticatorId = authenticatorId; // Also set on keyInfo
    this.activeKeyPairRecord = this.pendingKeyPairRecord;
    this.pendingKeyPairRecord = null;

    // Store the now-active keypair
    await this.storeKeyPairRecord(this.activeKeyPairRecord, "active");
    // Remove the pending record
    await this.removeKeyPairRecord("pending");
  }

  /**
   * Discard the pending keypair on rotation failure
   */
  async rollbackRotation(): Promise<void> {
    if (!this.pendingKeyPairRecord) {
      return; // Nothing to rollback
    }

    // Remove pending keypair
    await this.removeKeyPairRecord("pending");
    this.pendingKeyPairRecord = null;
  }

  private async generateAndStoreNewKeyPair(type: "active" | "pending"): Promise<KeyPairRecord> {
    // Generate non-extractable Ed25519 key pair using Web Crypto API
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "Ed25519",
      },
      false, // non-extractable - private key can never be exported
      ["sign", "verify"],
    );

    // Export public key in raw format (no ASN.1/DER wrapper)
    const rawPublicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    // Store raw public key as base58 (consistent with other stampers)
    const publicKeyBase58 = bs58.encode(new Uint8Array(rawPublicKeyBuffer));

    // Create a deterministic key ID from the raw public key
    const keyIdBuffer = await crypto.subtle.digest("SHA-256", rawPublicKeyBuffer);
    const keyId = base64urlEncode(new Uint8Array(keyIdBuffer)).substring(0, 16);

    const now = Date.now();
    const keyInfo: StamperKeyInfo = {
      keyId,
      publicKey: publicKeyBase58,
      createdAt: now,
    };

    const record: KeyPairRecord = {
      keyPair,
      keyInfo,
      createdAt: now,
      expiresAt: 0, // Not used anymore, kept for backward compatibility
      status: type,
    };

    // Store the record in IndexedDB
    await this.storeKeyPairRecord(record, type);

    return record;
  }

  private async storeKeyPairRecord(record: KeyPairRecord, type: "active" | "pending"): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const request = store.put(record, `${this.keyName}-${type}`);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async loadActiveKeyPairRecord(): Promise<KeyPairRecord | null> {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(`${this.keyName}-active`);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async loadPendingKeyPairRecord(): Promise<KeyPairRecord | null> {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(`${this.keyName}-pending`);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async removeKeyPairRecord(type: "active" | "pending"): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(`${this.keyName}-${type}`);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
