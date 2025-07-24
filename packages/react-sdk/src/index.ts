// Provider
export { PhantomProvider, usePhantom } from './PhantomProvider';
export type { PhantomProviderProps, PhantomSDKConfig } from './PhantomProvider';

// Hooks
export * from './hooks';

// Types
export * from './types';

// Re-export useful types and utilities from browser-sdk
export { 
  NetworkId, 
  AddressType,
  base64urlEncode, 
  base64urlDecode, 
  base64urlDecodeToString, 
  stringToBase64url 
} from '@phantom/browser-sdk';