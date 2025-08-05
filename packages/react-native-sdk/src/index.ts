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

// Note: AddressType is available through the WalletAddress interface from embedded-provider-core