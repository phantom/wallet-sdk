import * as SecureStore from "expo-secure-store";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import { generateKeyPair } from "@phantom/crypto";
import { base64urlEncode } from "@phantom/base64url";
import type { StamperWithKeyManagement, StamperKeyInfo } from "@phantom/sdk-types";
import type { Buffer } from "buffer";

export interface ReactNativeStamperConfig {
  keyPrefix?: string;
  organizationId?: string;
}

// Re-export for backwards compatibility
export type { StamperKeyInfo };

/**
 * React Native key manager that generates and stores cryptographic keys in SecureStore.
 * Provides full key lifecycle management including generation, storage, and signing.
 */
export class ReactNativeStamper implements StamperWithKeyManagement {
  private keyPrefix: string;
  private organizationId: string;
  private keyInfo: StamperKeyInfo | null = null;

  constructor(config: ReactNativeStamperConfig = {}) {
    this.keyPrefix = config.keyPrefix || "phantom-rn-stamper";
    this.organizationId = config.organizationId || "default";
  }

  /**
   * Initialize the stamper and generate/load cryptographic keys
   */
  async init(): Promise<StamperKeyInfo> {
    // Try to load existing key pair
    const storedSecretKey = await this.getStoredSecretKey();

    if (storedSecretKey) {
      // Load existing key pair
      const keyInfo = await this.getStoredKeyInfo();

      if (keyInfo) {
        this.keyInfo = keyInfo;
        return keyInfo;
      }
    }

    // Generate new key pair if none exists or data is corrupted
    const keyInfo = await this.generateAndStoreKeyPair();
    this.keyInfo = keyInfo;
    return keyInfo;
  }

  /**
   * Get the current key information
   */
  getKeyInfo(): StamperKeyInfo | null {
    return this.keyInfo;
  }

  /**
   * Generate and store a new key pair, replacing any existing keys
   */
  async resetKeyPair(): Promise<StamperKeyInfo> {
    await this.clear();
    const keyInfo = await this.generateAndStoreKeyPair();
    this.keyInfo = keyInfo;
    return keyInfo;
  }

  /**
   * Create X-Phantom-Stamp header value using stored secret key
   * @param data - Data to sign (Buffer)
   * @returns Complete X-Phantom-Stamp header value
   */
  async stamp({
    data
  }: {
    data: Buffer;
  }): Promise<string> {
    if (!this.keyInfo) {
      throw new Error("Stamper not initialized. Call init() first.");
    }

    // Get the secret key from secure storage
    const storedSecretKey = await this.getStoredSecretKey();
    if (!storedSecretKey) {
      throw new Error("Secret key not found in secure storage");
    }

    // Use ApiKeyStamper to create the stamp
    const apiKeyStamper = new ApiKeyStamper({ apiSecretKey: storedSecretKey });
    return await apiKeyStamper.stamp({ data });
  }

  /**
   * Clear all stored keys from SecureStore
   */
  async clear(): Promise<void> {
    const infoKey = this.getInfoKey();
    const secretKey = this.getSecretKey();

    try {
      await SecureStore.deleteItemAsync(infoKey);
    } catch (error) {
      // Key might not exist, continue
    }

    try {
      await SecureStore.deleteItemAsync(secretKey);
    } catch (error) {
      // Key might not exist, continue
    }

    this.keyInfo = null;
  }

  private async generateAndStoreKeyPair(): Promise<StamperKeyInfo> {
    // Generate Ed25519 keypair using our crypto package
    const keypair = generateKeyPair();

    // Create a deterministic key ID from the public key
    const keyId = this.createKeyId(keypair.publicKey);

    const keyInfo: StamperKeyInfo = {
      keyId,
      publicKey: keypair.publicKey,
    };

    // Store the keypair in SecureStore
    await this.storeKeyPair(keypair.secretKey, keyInfo);

    // Key pair is now stored securely

    return keyInfo;
  }

  private createKeyId(publicKey: string): string {
    // Create a simple deterministic ID from the public key
    return base64urlEncode(new TextEncoder().encode(publicKey)).substring(0, 16);
  }

  private async storeKeyPair(secretKey: string, keyInfo: StamperKeyInfo): Promise<void> {
    const infoKey = this.getInfoKey();
    const secretKeyName = this.getSecretKey();

    // Store key info as JSON
    await SecureStore.setItemAsync(infoKey, JSON.stringify(keyInfo), {
      requireAuthentication: false,
    });

    // Store secret key with high security
    await SecureStore.setItemAsync(secretKeyName, secretKey, {
      requireAuthentication: false,
    });
  }

  private async getStoredKeyInfo(): Promise<StamperKeyInfo | null> {
    try {
      const infoKey = this.getInfoKey();
      const storedInfo = await SecureStore.getItemAsync(infoKey);

      if (storedInfo) {
        return JSON.parse(storedInfo) as StamperKeyInfo;
      }
    } catch (error) {
      // If we can't read the key info, assume it doesn't exist
    }

    return null;
  }

  private async getStoredSecretKey(): Promise<string | null> {
    try {
      const secretKeyName = this.getSecretKey();
      return await SecureStore.getItemAsync(secretKeyName);
    } catch (error) {
      return null;
    }
  }

  private getInfoKey(): string {
    return `${this.keyPrefix}-${this.organizationId}-info`;
  }

  private getSecretKey(): string {
    return `${this.keyPrefix}-${this.organizationId}-secret`;
  }
}

// Export with the legacy name for compatibility
export { ReactNativeStamper as ExpoStamper };