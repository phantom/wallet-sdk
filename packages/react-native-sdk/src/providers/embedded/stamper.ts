import * as SecureStore from "expo-secure-store";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import { generateKeyPair } from "@phantom/crypto";
import { base64urlEncode } from "@phantom/base64url";
import type { StamperWithKeyManagement, StamperKeyInfo } from "@phantom/sdk-types";
import { Algorithm } from "@phantom/sdk-types";
import type { Buffer } from "buffer";

export interface ReactNativeStamperConfig {
  keyPrefix?: string;
  appId?: string;
}

// Re-export for backwards compatibility
export type { StamperKeyInfo };

interface StoredKeyRecord {
  keyInfo: StamperKeyInfo;
  secretKey: string;
  createdAt: number;
  expiresAt: number;
  authenticatorId?: string;
  status: "active" | "pending" | "expired";
}

/**
 * React Native key manager that generates and stores cryptographic keys in SecureStore.
 * Provides full key lifecycle management including generation, storage, and signing.
 */
export class ReactNativeStamper implements StamperWithKeyManagement {
  private keyPrefix: string;
  private appId: string;
  private activeKeyRecord: StoredKeyRecord | null = null;
  private pendingKeyRecord: StoredKeyRecord | null = null;
  algorithm = Algorithm.ed25519;
  type: "PKI" | "OIDC" = "PKI"; // Default to PKI, can be set to OIDC if needed
  idToken?: string; // Optional for PKI, required for OIDC
  salt?: string; // Optional for PKI, required for OIDC

  constructor(config: ReactNativeStamperConfig = {}) {
    this.keyPrefix = config.keyPrefix || "phantom-rn-stamper";
    this.appId = config.appId || "default";
  }

  /**
   * Initialize the stamper and generate/load cryptographic keys
   */
  async init(): Promise<StamperKeyInfo> {
    // Try to load existing active key record
    this.activeKeyRecord = await this.loadActiveKeyRecord();

    if (!this.activeKeyRecord) {
      // No existing keypair, generate new one
      this.activeKeyRecord = await this.generateAndStoreNewKeyRecord("active");
    }

    // Check if there's a pending key record from a previous rotation
    this.pendingKeyRecord = await this.loadPendingKeyRecord();

    return this.activeKeyRecord.keyInfo;
  }

  /**
   * Get the current key information
   */
  getKeyInfo(): StamperKeyInfo | null {
    return this.activeKeyRecord?.keyInfo || null;
  }

  /**
   * Generate and store a new key pair, replacing any existing keys
   */
  async resetKeyPair(): Promise<StamperKeyInfo> {
    await this.clear();
    this.activeKeyRecord = await this.generateAndStoreNewKeyRecord("active");
    this.pendingKeyRecord = null;
    return this.activeKeyRecord.keyInfo;
  }

  /**
   * Create X-Phantom-Stamp header value using stored secret key
   * @param params - Parameters object with data to sign and optional override params
   * @returns Complete X-Phantom-Stamp header value
   */
  async stamp(
    params:
      | { data: Buffer; type?: "PKI"; idToken?: never; salt?: never }
      | { data: Buffer; type: "OIDC"; idToken: string; salt: string },
  ): Promise<string> {
    if (!this.activeKeyRecord) {
      throw new Error("Stamper not initialized. Call init() first.");
    }

    // Use ApiKeyStamper to create the stamp with the active secret key
    const apiKeyStamper = new ApiKeyStamper({ apiSecretKey: this.activeKeyRecord.secretKey });
    return await apiKeyStamper.stamp(params);
  }

  /**
   * Clear all stored keys from SecureStore
   */
  async clear(): Promise<void> {
    const activeKey = this.getActiveKeyName();
    const pendingKey = this.getPendingKeyName();

    try {
      await SecureStore.deleteItemAsync(activeKey);
    } catch (error) {
      // Key might not exist, continue
    }

    try {
      await SecureStore.deleteItemAsync(pendingKey);
    } catch (error) {
      // Key might not exist, continue
    }

    this.activeKeyRecord = null;
    this.pendingKeyRecord = null;
  }

  /**
   * Generate a new keypair for rotation without making it active
   */
  async rotateKeyPair(): Promise<StamperKeyInfo> {
    this.pendingKeyRecord = await this.generateAndStoreNewKeyRecord("pending");
    return this.pendingKeyRecord.keyInfo;
  }

  /**
   * Switch to the pending keypair, making it active and cleaning up the old one
   */
  async commitRotation(authenticatorId: string): Promise<void> {
    if (!this.pendingKeyRecord) {
      throw new Error("No pending keypair to commit");
    }

    // Remove old active key
    if (this.activeKeyRecord) {
      try {
        await SecureStore.deleteItemAsync(this.getActiveKeyName());
      } catch (error) {
        // Key might not exist, continue
      }
    }

    // Promote pending to active
    this.pendingKeyRecord.status = "active";
    this.pendingKeyRecord.authenticatorId = authenticatorId;
    this.pendingKeyRecord.keyInfo.authenticatorId = authenticatorId; // Also set on keyInfo
    this.activeKeyRecord = this.pendingKeyRecord;
    this.pendingKeyRecord = null;

    // Store as active and remove pending
    await this.storeKeyRecord(this.activeKeyRecord, "active");
    try {
      await SecureStore.deleteItemAsync(this.getPendingKeyName());
    } catch (error) {
      // Key might not exist, continue
    }
  }

  /**
   * Discard the pending keypair on rotation failure
   */
  async rollbackRotation(): Promise<void> {
    if (!this.pendingKeyRecord) {
      return; // Nothing to rollback
    }

    // Remove pending key
    try {
      await SecureStore.deleteItemAsync(this.getPendingKeyName());
    } catch (error) {
      // Key might not exist, continue
    }

    this.pendingKeyRecord = null;
  }

  private async generateAndStoreNewKeyRecord(type: "active" | "pending"): Promise<StoredKeyRecord> {
    // Generate Ed25519 keypair using our crypto package
    const keypair = generateKeyPair();

    // Create a deterministic key ID from the public key
    const keyId = this.createKeyId(keypair.publicKey);

    const now = Date.now();
    const keyInfo: StamperKeyInfo = {
      keyId,
      publicKey: keypair.publicKey,
      createdAt: now,
    };

    const record: StoredKeyRecord = {
      keyInfo,
      secretKey: keypair.secretKey,
      createdAt: now,
      expiresAt: 0, // Not used anymore, kept for backward compatibility
      status: type,
    };

    // Store the record in SecureStore
    await this.storeKeyRecord(record, type);

    return record;
  }

  private createKeyId(publicKey: string): string {
    // Create a simple deterministic ID from the public key
    return base64urlEncode(new TextEncoder().encode(publicKey)).substring(0, 16);
  }

  private async storeKeyRecord(record: StoredKeyRecord, type: "active" | "pending"): Promise<void> {
    const keyName = type === "active" ? this.getActiveKeyName() : this.getPendingKeyName();

    // Store the entire record as JSON
    await SecureStore.setItemAsync(keyName, JSON.stringify(record), {
      requireAuthentication: false,
    });
  }

  private async loadActiveKeyRecord(): Promise<StoredKeyRecord | null> {
    try {
      const activeKey = this.getActiveKeyName();
      const storedRecord = await SecureStore.getItemAsync(activeKey);

      if (storedRecord) {
        return JSON.parse(storedRecord) as StoredKeyRecord;
      }
    } catch (error) {
      // If we can't read the key record, assume it doesn't exist
    }

    return null;
  }

  private async loadPendingKeyRecord(): Promise<StoredKeyRecord | null> {
    try {
      const pendingKey = this.getPendingKeyName();
      const storedRecord = await SecureStore.getItemAsync(pendingKey);

      if (storedRecord) {
        return JSON.parse(storedRecord) as StoredKeyRecord;
      }
    } catch (error) {
      // If we can't read the key record, assume it doesn't exist
    }

    return null;
  }

  private getActiveKeyName(): string {
    return `${this.keyPrefix}-${this.appId}-active`;
  }

  private getPendingKeyName(): string {
    return `${this.keyPrefix}-${this.appId}-pending`;
  }
}

// Export with the legacy name for compatibility
export { ReactNativeStamper as ExpoStamper };
