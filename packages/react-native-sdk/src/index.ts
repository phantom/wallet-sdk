// Main provider and context
export { PhantomProvider, usePhantom } from "./PhantomProvider";

// ReactNative SDK class (for direct usage)
export { ReactNativeSDK } from "./ReactNativeSDK";

// Individual hooks
export * from "./hooks";


// Types
export type {
  PhantomSDKConfig,
  ConnectOptions,
  ConnectResult,
  WalletAddress,
  SignMessageParams,
  SignMessageResult,
  SignAndSendTransactionParams,
  SignedTransaction,
} from "./types";

export { AddressType } from "@phantom/client";
export { NetworkId } from "@phantom/constants";
