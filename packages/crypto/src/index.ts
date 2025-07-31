import nacl from "tweetnacl";
import bs58 from "bs58";
import { Buffer } from "buffer";

export interface Keypair {
  publicKey: string;
  secretKey: string;
}

/**
 * Generate a new Ed25519 keypair
 * @returns A keypair with base58-encoded public and secret keys
 */
export function generateKeyPair(): Keypair {
  const keypair = nacl.sign.keyPair();
  return {
    publicKey: bs58.encode(keypair.publicKey),
    secretKey: bs58.encode(keypair.secretKey),
  };
}

/**
 * Create a keypair from a base58-encoded private key
 * @param b58PrivateKey - Base58-encoded private key
 * @returns A keypair with base58-encoded public and secret keys
 */
export function createKeyPairFromSecret(b58PrivateKey: string): Keypair {
  const secretKeyBytes = bs58.decode(b58PrivateKey);
  const keypair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
  return {
    publicKey: bs58.encode(keypair.publicKey),
    secretKey: bs58.encode(keypair.secretKey),
  };
}

/**
 * Sign data using Ed25519 with a secret key
 * @param secretKey - Base58-encoded secret key or raw Uint8Array
 * @param data - Data to sign (string, Uint8Array, or Buffer)
 * @returns Base64-encoded signature
 */
export function signWithSecret(secretKey: string | Uint8Array, data: string | Uint8Array | Buffer): Uint8Array {
  // Decode secret key if it's a string
  const secretKeyBytes = typeof secretKey === "string" ? bs58.decode(secretKey) : secretKey;

  // Convert data to Uint8Array if needed
  let dataBytes: Uint8Array;
  if (typeof data === "string") {
    dataBytes = new TextEncoder().encode(data);
  } else if (data instanceof Buffer) {
    dataBytes = new Uint8Array(data);
  } else {
    dataBytes = data;
  }

  // Sign the data
  return nacl.sign.detached(dataBytes, secretKeyBytes);
}
