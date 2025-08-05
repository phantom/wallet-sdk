// Main provider and context
export { PhantomProvider, usePhantom } from './PhantomProvider';

// Individual hooks
export {
  useConnect,
  useDisconnect,
  useAccounts,
  useSignMessage,
  useSignAndSendTransaction,
} from './hooks';

// Types
export type {
  PhantomProviderConfig,
  ReactNativeAuthOptions,
  ConnectOptions,
  ConnectResult,
  WalletAddress,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignedTransaction,
} from './types';

// Re-export AddressType for proper usage in configuration
export { AddressType } from '@phantom/client';