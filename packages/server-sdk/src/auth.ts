import axios, { AxiosInstance } from 'axios';
import nacl from 'tweetnacl';

/**
 * Creates an authenticated axios instance that signs requests with Ed25519
 */
export function createAuthenticatedAxiosInstance(signingKeypair: nacl.SignKeyPair): AxiosInstance {
  const instance = axios.create();

  instance.interceptors.request.use((config) => {

    // Sign the message
    const requestBody = typeof config.data === "string" ? config.data : JSON.stringify(config.data);
    const dataUtf8 = Buffer.from(requestBody, "utf8");
    const signature = nacl.sign.detached(dataUtf8, signingKeypair.secretKey);

    // Create the stamp object
    const stamp = {
      kind: "PKI",
      publicKey: Buffer.from(signingKeypair.publicKey).toString("base64url"),
      signature: Buffer.from(signature).toString("base64url"),
    };

    // Encode the stamp as base64url
    const stampB64 = Buffer.from(JSON.stringify(stamp)).toString("base64url");
    config.headers["X-Phantom-Stamp"] = stampB64;

    return config;
  });

  return instance;
}