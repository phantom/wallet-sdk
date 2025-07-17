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

    config.headers["X-Phantom-Sig"] = Buffer.from(signature).toString("base64");

    return config;
  });

  return instance;
}