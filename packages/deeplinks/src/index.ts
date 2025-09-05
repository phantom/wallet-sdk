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

// URL Response Parsing Utilities

export type DeeplinkResponseType = 'connect' | 'signMessage' | 'signTransaction' | 'signAndSendTransaction' | 'disconnect' | 'error' | 'none';

export type DeeplinkResponseInfo = {
  type: DeeplinkResponseType;
  isSuccess: boolean;
  hasEncryptedData: boolean;
  hasError: boolean;
  errorCode?: string;
  errorMessage?: string;
  phantomEncryptionPublicKey?: string;
  requestId?: string;
  data?: {
    nonce?: string;
    encryptedPayload?: string;
  };
}

/**
 * Parse a URL to determine if it contains a Phantom deeplink response
 * @param url - The URL to parse (defaults to current window.location.href)
 * @returns Information about the deeplink response
 */
export function parseDeeplinkResponse(url?: string): DeeplinkResponseInfo {
  const urlToParse = url || (typeof window !== "undefined" ? window.location.href : "");
  
  if (!urlToParse) {
    return { type: 'none', isSuccess: false, hasEncryptedData: false, hasError: false };
  }

  try {
    const urlObj = new URL(urlToParse);
    const params = new URLSearchParams(urlObj.search);
    const hashParams = new URLSearchParams(urlObj.hash.replace('#', ''));
    
    // Combine search and hash parameters
    const allParams = new Map<string, string>();
    params.forEach((value, key) => allParams.set(key, value));
    hashParams.forEach((value, key) => allParams.set(key, value));
    
    const hasPhantomEncryptionKey = allParams.has('phantom_encryption_public_key');
    const hasNonce = allParams.has('nonce');
    const hasData = allParams.has('data');
    const hasPhantomResponse = urlObj.hash.includes('phantom_response');
    const hasErrorCode = allParams.has('errorCode');
    const hasErrorMessage = allParams.has('errorMessage');
    
    // Check for error response
    if (hasErrorCode || hasErrorMessage) {
      return {
        type: 'error',
        isSuccess: false,
        hasEncryptedData: false,
        hasError: true,
        errorCode: allParams.get('errorCode') || undefined,
        errorMessage: allParams.get('errorMessage') || undefined,
        requestId: allParams.get('request_id') || undefined
      };
    }
    
    // No response parameters found
    if (!hasPhantomEncryptionKey && !hasNonce && !hasData && !hasPhantomResponse) {
      return { type: 'none', isSuccess: false, hasEncryptedData: false, hasError: false };
    }
    
    const result: DeeplinkResponseInfo = {
      type: 'none',
      isSuccess: true,
      hasEncryptedData: hasNonce && hasData,
      hasError: false,
      phantomEncryptionPublicKey: allParams.get('phantom_encryption_public_key') || undefined,
      requestId: allParams.get('request_id') || undefined,
      data: (hasNonce || hasData) ? {
        nonce: allParams.get('nonce') || undefined,
        encryptedPayload: allParams.get('data') || undefined,
      } : undefined
    };
    
    // Determine response type based on parameters
    if (hasPhantomEncryptionKey) {
      result.type = 'connect';
    } else if (hasNonce && hasData) {
      // For encrypted responses, we can't easily distinguish between signMessage and signTransaction
      // without decrypting, so we use a generic type or let the app determine from context
      result.type = 'signMessage'; // Default assumption
    }
    
    return result;
    
  } catch (error) {
    return { type: 'none', isSuccess: false, hasEncryptedData: false, hasError: false };
  }
}

/**
 * Check if the current URL indicates a successful Phantom connection
 * @param url - The URL to check (defaults to current window.location.href)
 */
export function isConnectSuccess(url?: string): boolean {
  const response = parseDeeplinkResponse(url);
  return response.type === 'connect' && response.isSuccess && !response.hasError;
}

/**
 * Check if the current URL indicates a successful message signing
 * @param url - The URL to check (defaults to current window.location.href)
 */
export function isSignMessageSuccess(url?: string): boolean {
  const response = parseDeeplinkResponse(url);
  return response.type === 'signMessage' && response.isSuccess && response.hasEncryptedData && !response.hasError;
}

/**
 * Check if the current URL indicates a successful transaction signing
 * @param url - The URL to check (defaults to current window.location.href)
 */
export function isSignTransactionSuccess(url?: string): boolean {
  const response = parseDeeplinkResponse(url);
  return (response.type === 'signTransaction' || response.type === 'signAndSendTransaction') && 
         response.isSuccess && response.hasEncryptedData && !response.hasError;
}

/**
 * Check if the current URL indicates any Phantom deeplink error
 * @param url - The URL to check (defaults to current window.location.href)
 */
export function isDeeplinkError(url?: string): { hasError: boolean; errorCode?: string; errorMessage?: string } {
  const response = parseDeeplinkResponse(url);
  return {
    hasError: response.hasError,
    errorCode: response.errorCode,
    errorMessage: response.errorMessage
  };
}