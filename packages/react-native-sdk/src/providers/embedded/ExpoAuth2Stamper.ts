import * as SecureStore from "expo-secure-store";
import bs58 from "bs58";
import { Buffer } from "buffer";
import { base64urlEncode } from "@phantom/base64url";
import { Algorithm } from "@phantom/sdk-types";
import type { StamperWithKeyManagement, StamperKeyInfo } from "@phantom/sdk-types";

interface StoredKeyRecord {
  privateKeyPkcs8: string;
  keyInfo: StamperKeyInfo;
  /** Persisted so that auto-connect can restore OIDC stamping without a new login. */
  idToken?: string;
}

export class ExpoAuth2Stamper implements StamperWithKeyManagement {
  private _keyPair: CryptoKeyPair | null = null;
  private _keyInfo: StamperKeyInfo | null = null;
  private _idToken: string | null = null;

  readonly algorithm: Algorithm = Algorithm.secp256r1;
  readonly type = "OIDC";

  /**
   * @param storageKey - expo-secure-store key used to persist the P-256 private key.
   *   Use a unique key per app, e.g. `phantom-auth2-<appId>`.
   */
  constructor(private readonly storageKey: string) {}

  async init(): Promise<StamperKeyInfo> {
    const stored = await this.loadRecord();
    if (stored) {
      this._keyPair = {
        privateKey: await this.importPrivateKey(stored.privateKeyPkcs8),
        publicKey: await this.importPublicKeyFromBase58(stored.keyInfo.publicKey),
      };
      this._keyInfo = stored.keyInfo;
      if (stored.idToken) {
        this._idToken = stored.idToken;
      }
      return this._keyInfo;
    }

    return this.generateAndStore();
  }

  getKeyInfo(): StamperKeyInfo | null {
    return this._keyInfo;
  }

  getCryptoKeyPair(): CryptoKeyPair | null {
    return this._keyPair;
  }

  /**
   * Arms the stamper with the OIDC id token for subsequent KMS stamp() calls.
   *
   * Persists the token to SecureStore alongside the key pair so that
   * auto-connect can restore it on the next app launch without a new login.
   */
  async setIdToken(idToken: string): Promise<void> {
    this._idToken = idToken;

    const existing = await this.loadRecord();
    if (existing) {
      await this.storeRecord({ ...existing, idToken });
    }
  }

  async stamp(params: { data: Buffer; type?: "PKI" } | { data: Buffer; type: "OIDC" }): Promise<string> {
    if (!this._keyPair || !this._keyInfo || this._idToken === null) {
      throw new Error("ExpoAuth2Stamper not initialized. Call init() first.");
    }

    const signatureRaw = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      this._keyPair.privateKey,
      new Uint8Array(params.data) as BufferSource,
    );

    const rawPublicKey = bs58.decode(this._keyInfo.publicKey);

    const stampData = {
      kind: this.type,
      idToken: this._idToken,
      publicKey: base64urlEncode(rawPublicKey),
      algorithm: this.algorithm,
      // The P-256 ephemeral key is unique per wallet, so no additional salt is needed.
      salt: "",
      signature: base64urlEncode(new Uint8Array(signatureRaw)),
    };

    return base64urlEncode(new TextEncoder().encode(JSON.stringify(stampData)));
  }

  async resetKeyPair(): Promise<StamperKeyInfo> {
    await this.clear();
    return this.generateAndStore();
  }

  async clear(): Promise<void> {
    await this.clearStoredRecord();
    this._keyPair = null;
    this._keyInfo = null;
    this._idToken = null;
  }

  // Auth2 doesn't use key rotation; minimal no-op implementations.
  async rotateKeyPair(): Promise<StamperKeyInfo> {
    return this.init();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async commitRotation(authenticatorId: string): Promise<void> {
    if (this._keyInfo) {
      this._keyInfo.authenticatorId = authenticatorId;
    }
  }

  async rollbackRotation(): Promise<void> {}

  private async generateAndStore(): Promise<StamperKeyInfo> {
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true, // extractable — needed to export PKCS#8 for SecureStore
      ["sign", "verify"],
    );

    // Raw export of P-256 public key = 65-byte uncompressed point (0x04 || x || y).
    const rawPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));

    // Store public key as base58 so deriveNonce(base58PubKey) works unchanged:
    //   nonce = base64url(SHA-256(bs58.decode(publicKey))) = base64url(SHA-256(rawP256Bytes))
    const publicKeyBase58 = bs58.encode(rawPublicKey);

    const keyIdBuffer = await crypto.subtle.digest("SHA-256", rawPublicKey.buffer as ArrayBuffer);
    const keyId = base64urlEncode(new Uint8Array(keyIdBuffer)).substring(0, 16);

    this._keyPair = keyPair;
    this._keyInfo = { keyId, publicKey: publicKeyBase58, createdAt: Date.now() };

    // Export the private key as PKCS#8 for persistent storage.
    const pkcs8Buffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyPkcs8 = Buffer.from(pkcs8Buffer).toString("base64");

    await this.storeRecord({ privateKeyPkcs8, keyInfo: this._keyInfo });
    return this._keyInfo;
  }

  private async importPublicKeyFromBase58(base58PublicKey: string): Promise<CryptoKey> {
    const rawBytes = bs58.decode(base58PublicKey);
    return crypto.subtle.importKey(
      "raw",
      rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength) as ArrayBuffer,
      { name: "ECDSA", namedCurve: "P-256" },
      true, // extractable so createAuth2RequestJar can export it as JWK
      ["verify"],
    );
  }

  private async importPrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
    const pkcs8Bytes = Buffer.from(pkcs8Base64, "base64");
    return crypto.subtle.importKey(
      "pkcs8",
      pkcs8Bytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false, // non-extractable once loaded into memory
      ["sign"],
    );
  }

  private async loadRecord(): Promise<StoredKeyRecord | null> {
    try {
      const raw = await SecureStore.getItemAsync(this.storageKey);
      return raw ? (JSON.parse(raw) as StoredKeyRecord) : null;
    } catch {
      return null;
    }
  }

  private async storeRecord(record: StoredKeyRecord): Promise<void> {
    await SecureStore.setItemAsync(this.storageKey, JSON.stringify(record), { requireAuthentication: false });
  }

  private async clearStoredRecord(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.storageKey);
    } catch {
      // Key might not exist; safe to ignore.
    }
  }
}
