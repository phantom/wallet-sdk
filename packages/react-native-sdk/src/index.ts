// Main provider and context
export { PhantomProvider, usePhantom } from "./PhantomProvider";

// Individual hooks
export * from "./hooks";

// Types
export type {
  PhantomSDKConfig,
  PhantomDebugConfig,
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
