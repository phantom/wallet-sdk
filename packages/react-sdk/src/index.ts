// Provider
export { PhantomProvider, usePhantom } from "./PhantomProvider";
export type { PhantomProviderProps, PhantomSDKConfig, PhantomDebugConfig, ConnectOptions } from "./PhantomProvider";

// Hooks
export * from "./hooks";

// Types
export * from "./types";

// Re-export useful types and utilities from browser-sdk
export { NetworkId, AddressType, DebugLevel, debug } from "@phantom/browser-sdk";
export type {
  DebugMessage,
  SignAndSendTransactionParams,
  SignedTransaction,
  SignMessageParams,
  SignMessageResult,
} from "@phantom/browser-sdk";
