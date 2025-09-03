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
  idToken?: string; // Optional for PKI, required for OIDC
  salt?: string; // Optional for PKI, required for OIDC
  private keypair: { publicKey: string; secretKey: string };

  constructor(config: ApiKeyStamperConfig) {
    this.keypair = createKeyPairFromSecret(config.apiSecretKey);
  }

  /**
   * Create X-Phantom-Stamp header value
   * @param params - Parameters object with data to sign
   * @returns Complete X-Phantom-Stamp header value
   */
  async stamp(
    params:
      | { data: Buffer; type?: "PKI"; idToken?: never; salt?: never }
      | { data: Buffer; type: "OIDC"; idToken: string; salt: string },
  ): Promise<string> {
    const { data } = params;
    // Sign the data
    const signature = signWithSecret(this.keypair.secretKey, data);
    const signatureBase64url = base64urlEncode(signature);

    // Determine stamp type - use override parameter if provided, otherwise use instance type
    const stampType = params.type || this.type;

    // Create the stamp structure based on stamp type
    const stampData =
      stampType === "PKI"
        ? {
            publicKey: base64urlEncode(bs58.decode(this.keypair.publicKey)),
            signature: signatureBase64url,
            kind: "PKI",
            algorithm: this.algorithm,
          }
        : {
            kind: "OIDC",
            idToken: params.type === "OIDC" ? params.idToken : this.idToken,
            publicKey: base64urlEncode(bs58.decode(this.keypair.publicKey)),
            salt: params.type === "OIDC" ? params.salt : this.salt,
            algorithm: this.algorithm,
            signature: signatureBase64url,
          };

    // Encode the entire stamp as base64url JSON
    const stampJson = JSON.stringify(stampData);
    return Promise.resolve(base64urlEncode(new TextEncoder().encode(stampJson)));
  }
}
