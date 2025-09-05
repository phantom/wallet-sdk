/**
 * Phantom Wallet Deeplinks URL Generation Utilities
 * 
 * Pure functions for generating Phantom deeplink URLs for various wallet operations.
 * Follows Phantom's deeplinks documentation: https://docs.phantom.com/deeplinks
 */

export type EncryptedPayload = {
  data: string;
  nonce: string;
}

export type ConnectDeeplinkParams = {
  dappEncryptionPublicKey: string;
  cluster?: string;
  appUrl?: string;
  redirectLink?: string;
}

export type SignMessageDeeplinkParams = {
  dappEncryptionPublicKey: string;
  data: EncryptedPayload;
  redirectLink?: string;
}

export type SignTransactionDeeplinkParams = {
  data: EncryptedPayload;
  redirectLink?: string;
}

export type SignAndSendTransactionDeeplinkParams = {
  data: EncryptedPayload;
  redirectLink?: string;
}

export type DisconnectDeeplinkParams = {
  data?: EncryptedPayload;
  redirectLink?: string;
}

/**
 * Base Phantom deeplinks URL
 */
export const PHANTOM_DEEPLINKS_BASE_URL = "https://phantom.app/ul/v1";

/**
 * Generate a connect deeplink URL
 * Used to establish a connection between the dapp and Phantom wallet
 */
export function generateConnectDeeplink(params: ConnectDeeplinkParams): string {
  const url = new URL(`${PHANTOM_DEEPLINKS_BASE_URL}/connect`);
  
  // Required parameter
  url.searchParams.set("dapp_encryption_public_key", params.dappEncryptionPublicKey);
  
  // Optional parameters
  if (params.cluster) {
    url.searchParams.set("cluster", params.cluster);
  }
  
  if (params.appUrl) {
    url.searchParams.set("app_url", params.appUrl);
  }
  
  if (params.redirectLink) {
    url.searchParams.set("redirect_link", params.redirectLink);
  }
  
  return url.toString();
}

/**
 * Generate a sign message deeplink URL
 * Used to request message signing from Phantom wallet
 * Format: https://phantom.app/ul/v1/signMessage?dapp_encryption_public_key=...&nonce=...&payload=...&redirect_link=...
 */
export function generateSignMessageDeeplink(params: SignMessageDeeplinkParams): string {
  const url = new URL(`${PHANTOM_DEEPLINKS_BASE_URL}/signMessage`);
  
  // Add required parameters according to Phantom documentation
  url.searchParams.set("dapp_encryption_public_key", params.dappEncryptionPublicKey);
  url.searchParams.set("nonce", params.data.nonce);
  url.searchParams.set("payload", params.data.data);
  
  if (params.redirectLink) {
    url.searchParams.set("redirect_link", params.redirectLink);
  }
  
  return url.toString();
}

/**
 * Generate a sign transaction deeplink URL
 * Used to request transaction signing from Phantom wallet
 */
export function generateSignTransactionDeeplink(params: SignTransactionDeeplinkParams): string {
  const url = new URL(`${PHANTOM_DEEPLINKS_BASE_URL}/signTransaction`);
  
  // Add encrypted data
  url.searchParams.set("data", params.data.data);
  url.searchParams.set("nonce", params.data.nonce);
  
  if (params.redirectLink) {
    url.searchParams.set("redirect_link", params.redirectLink);
  }
  
  return url.toString();
}

/**
 * Generate a sign and send transaction deeplink URL
 * Used to request transaction signing and sending from Phantom wallet
 */
export function generateSignAndSendTransactionDeeplink(params: SignAndSendTransactionDeeplinkParams): string {
  const url = new URL(`${PHANTOM_DEEPLINKS_BASE_URL}/signAndSendTransaction`);
  
  // Add encrypted data
  url.searchParams.set("data", params.data.data);
  url.searchParams.set("nonce", params.data.nonce);
  
  if (params.redirectLink) {
    url.searchParams.set("redirect_link", params.redirectLink);
  }
  
  return url.toString();
}

/**
 * Generate a disconnect deeplink URL
 * Used to disconnect from Phantom wallet
 */
export function generateDisconnectDeeplink(params: DisconnectDeeplinkParams = {}): string {
  const url = new URL(`${PHANTOM_DEEPLINKS_BASE_URL}/disconnect`);
  
  // Add encrypted data if provided
  if (params.data) {
    url.searchParams.set("data", params.data.data);
    url.searchParams.set("nonce", params.data.nonce);
  }
  
  if (params.redirectLink) {
    url.searchParams.set("redirect_link", params.redirectLink);
  }
  
  return url.toString();
}

/**
 * Helper function to get current origin for redirect links
 * Can be used when generating deeplinks in browser environments
 */
export function getCurrentOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

/**
 * Helper function to build redirect link with current URL
 * Useful for ensuring Phantom redirects back to the correct page
 */
export function buildRedirectLink(basePath?: string): string {
  const origin = getCurrentOrigin();
  if (!origin) return "";
  
  return basePath ? `${origin}${basePath}` : origin;
}