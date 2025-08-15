import type { Buffer } from "buffer";
import { base64urlEncode } from "@phantom/base64url";
import { createKeyPairFromSecret, signWithSecret } from "@phantom/crypto";
import bs58 from "bs58";
import type { Stamper } from "@phantom/sdk-types";
import { Algorithm } from "@phantom/sdk-types";
export interface ApiKeyStamperConfig {
  apiSecretKey: string;
}

/**
 * Simple stamper that takes a pre-existing secret key and creates stamps
 * Does not manage keys - just signs with the provided secret key
 */
export class ApiKeyStamper implements Stamper {
  algorithm = Algorithm.ed25519; // Use the same algorithm as the keypair
  type: "PKI" | "OIDC" = "PKI"; // This stamper only supports PKI type
  private keypair: { publicKey: string; secretKey: string };

  constructor(config: ApiKeyStamperConfig) {
    this.keypair = createKeyPairFromSecret(config.apiSecretKey);
  }

  /**
   * Create X-Phantom-Stamp header value
   * @param params - Parameters object with data to sign
   * @returns Complete X-Phantom-Stamp header value
   */
  async stamp({ data }: { data: Buffer }): Promise<string> {
    // Sign the data
    const signature = signWithSecret(this.keypair.secretKey, data);
    const signatureBase64url = base64urlEncode(signature);

    // Create the stamp structure
    const stampData = {
      publicKey: base64urlEncode(bs58.decode(this.keypair.publicKey)),
      signature: signatureBase64url,
      kind: this.type,
    };

    // Encode the entire stamp as base64url JSON
    const stampJson = JSON.stringify(stampData);
    return Promise.resolve(base64urlEncode(new TextEncoder().encode(stampJson)));
  }
}
