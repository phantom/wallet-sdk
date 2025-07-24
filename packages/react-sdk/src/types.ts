// Re-export types from browser-sdk
export type { 
  NetworkId,
  AddressType,
  WalletAddress,
  SignedTransaction,
} from '@phantom/browser-sdk';

// React SDK specific types
export interface SignMessageParams {
  message: string; // base64url encoded message
  networkId: string;
}

export interface SignAndSendTransactionParams {
  transaction: string; // base64url encoded transaction
  networkId: string;
}