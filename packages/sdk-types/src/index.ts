import type { Buffer } from "buffer";
import type { Algorithm } from "@phantom/openapi-wallet-service";
export { Algorithm } from "@phantom/openapi-wallet-service";

// Re-export Solana transaction types (type-only to avoid runtime dependency)
export type { Transaction, VersionedTransaction } from "@solana/web3.js";
// Stamper interface - takes Buffer data and returns complete X-Phantom-Stamp header value
export interface Stamper {
  stamp(params: { data: Buffer; type?: "PKI"; idToken?: never; salt?: never }): Promise<string>;
  stamp(params: { data: Buffer; type: "OIDC"; idToken: string; salt: string }): Promise<string>;
  algorithm: Algorithm;
  type: "PKI" | "OIDC";
  idToken?: string;
  salt?: string;
}

// Key information structure returned by stampers
export interface StamperKeyInfo {
  keyId: string;
  publicKey: string;
  createdAt?: number; // Optional timestamp when key was created
  authenticatorId?: string; // Optional authenticator ID from server
}

// Extended stamper interface for stampers that manage their own keys
export interface StamperWithKeyManagement extends Stamper {
  init(): Promise<StamperKeyInfo>;
  getKeyInfo(): StamperKeyInfo | null;
  resetKeyPair(): Promise<StamperKeyInfo>;
  clear(): Promise<void>;

  // Key rotation methods for seamless key transitions
  rotateKeyPair(): Promise<StamperKeyInfo>; // Generate new keypair, keep old as pending
  commitRotation(authenticatorId: string): Promise<void>; // Switch to new keypair
  rollbackRotation(): Promise<void>; // Discard pending keypair on failure
}
