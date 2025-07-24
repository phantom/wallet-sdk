// Main SDK
export { BrowserSDK } from './BrowserSDK';

// Types
export * from './types';

// Re-export useful types from client
export { NetworkId, AddressType } from '@phantom/client';

// Export base64url utilities
export { 
  base64urlEncode, 
  base64urlDecode, 
  base64urlDecodeToString, 
  stringToBase64url 
} from './utils/base64url';