import type { Buffer } from "buffer";
import { base64urlEncode } from "@phantom/base64url";
import { createKeyPairFromSecret, signWithSecret } from "@phantom/crypto";
import bs58 from "bs58";

export interface ApiKeyStamperConfig {
  apiSecretKey: string;
}

/**
 * Simple stamper that takes a pre-existing secret key and creates stamps
 * Does not manage keys - just signs with the provided secret key
 */
export class ApiKeyStamper {
  private keypair: { publicKey: string; secretKey: string };

  constructor(config: ApiKeyStamperConfig) {
    this.keypair = createKeyPairFromSecret(config.apiSecretKey);
  }

  /**
   * Create X-Phantom-Stamp header value
   * @param data - Data to sign (Buffer)
   * @returns Complete X-Phantom-Stamp header value
   */
  stamp(data: Buffer): string {
    // Sign the data
    const signature = signWithSecret(this.keypair.secretKey, data);
    const signatureBase64url = base64urlEncode(signature);
    
    // Create the stamp structure
    const stampData = {
      publicKey: base64urlEncode(bs58.decode(this.keypair.publicKey)),
      signature: signatureBase64url,
      kind: "PKI" as const,
    };

    // Encode the entire stamp as base64url JSON
    const stampJson = JSON.stringify(stampData);
    return base64urlEncode(new TextEncoder().encode(stampJson));
  }
}
