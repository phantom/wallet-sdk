import type { AxiosRequestConfig } from "axios";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Buffer } from "buffer";
export interface ApiKeyStamperConfig {
  apiSecretKey: string;
}

/**
 * Convert Uint8Array to base64url string
 */
function base64urlEncode(data: Uint8Array): string {
  // Convert Uint8Array to base64
  const base64 = Buffer.from(data).toString("base64");
  // Convert base64 to base64url
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Convert string to base64url string
 */
function stringToBase64url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return base64urlEncode(bytes);
}

/**
 * ApiKeyStamper that signs requests with Ed25519
 */
export class ApiKeyStamper {
  private signingKeypair: nacl.SignKeyPair;

  constructor(config: ApiKeyStamperConfig) {
    // Decode the secret key from base58
    const secretKeyBytes = bs58.decode(config.apiSecretKey);
    this.signingKeypair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
  }

  /**
   * Stamp (sign) an axios request configuration
   */
  async stamp(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    // Sign the message
    const requestBody =
      typeof config.data === "string" ? config.data : config.data === undefined ? "" : JSON.stringify(config.data);
    const dataUtf8 = Buffer.from(requestBody, "utf8");
    const signature = nacl.sign.detached(dataUtf8, this.signingKeypair.secretKey);

    // Create the new stamp structure
    const stampData = {
      publicKey: base64urlEncode(this.signingKeypair.publicKey),
      signature: base64urlEncode(signature),
      kind: "PKI" as const,
    };

    // Encode the entire stamp as base64url JSON
    const stampJson = JSON.stringify(stampData);
    const stamp = stringToBase64url(stampJson);

    // Add the new stamp header
    config.headers = config.headers || {};
    config.headers["X-Phantom-Stamp"] = stamp;
    return Promise.resolve(config);
  }
}
