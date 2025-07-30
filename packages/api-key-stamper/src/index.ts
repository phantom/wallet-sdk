import type { AxiosRequestConfig } from "axios";
import { Buffer } from "buffer";
import { base64urlEncode, stringToBase64url } from "@phantom/base64url";
import { createKeyPairFromSecret, signWithSecret } from "@phantom/crypto";
import bs58 from "bs58";
export interface ApiKeyStamperConfig {
  apiSecretKey: string;
}

/**
 * ApiKeyStamper that signs requests with Ed25519
 */
export class ApiKeyStamper {
  private keypair: { publicKey: string; secretKey: string };

  constructor(config: ApiKeyStamperConfig) {
    // Create keypair from the provided secret key
    this.keypair = createKeyPairFromSecret(config.apiSecretKey);
  }

  /**
   * Stamp (sign) an axios request configuration
   */
  async stamp(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    // Sign the message
    const requestBody =
      typeof config.data === "string" ? config.data : config.data === undefined ? "" : JSON.stringify(config.data);
    const dataUtf8 = Buffer.from(requestBody, "utf8");
    const signature = signWithSecret(this.keypair.secretKey, dataUtf8);

    // Create the new stamp structure
    const stampData = {
      // The keypair is bs58 encoded, need to decode and then base64url encode the public key
      publicKey: base64urlEncode(bs58.decode(this.keypair.publicKey)),  
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
