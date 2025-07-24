import { AxiosRequestConfig } from 'axios';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export interface ApiKeyStamperConfig {
  apiSecretKey: string;
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
    const requestBody = typeof config.data === "string" ? config.data : JSON.stringify(config.data);
    const dataUtf8 = Buffer.from(requestBody, "utf8");
    const signature = nacl.sign.detached(dataUtf8, this.signingKeypair.secretKey);

    // Add signature header
    config.headers = config.headers || {};
    config.headers["X-Phantom-Sig"] = Buffer.from(signature).toString("base64url");

    return config;
  }
}