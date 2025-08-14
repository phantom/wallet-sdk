import type { Buffer } from "buffer";
import type { Algorithm } from "@phantom/openapi-wallet-service";
export { Algorithm } from "@phantom/openapi-wallet-service";
// Stamper interface - takes Buffer data and returns complete X-Phantom-Stamp header value
export interface Stamper {
  stamp(params: { data: Buffer; type?: "PKI"; idToken?: never; salt?: never }): Promise<string>;
  stamp(params: { data: Buffer; type: "OIDC"; idToken: string; salt: string }): Promise<string>;
  algorithm: Algorithm;
}

// Key information structure returned by stampers
export interface StamperKeyInfo {
  keyId: string;
  publicKey: string;
}

// Extended stamper interface for stampers that manage their own keys
export interface StamperWithKeyManagement extends Stamper {
  init(): Promise<StamperKeyInfo>;
  getKeyInfo(): StamperKeyInfo | null;
  resetKeyPair?(): Promise<StamperKeyInfo>;
  clear?(): Promise<void>;
}
