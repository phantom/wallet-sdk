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

// Event types for typed event handlers
export type {
  EmbeddedProviderEvent,
  ConnectEventData,
  ConnectStartEventData,
  ConnectErrorEventData,
  DisconnectEventData,
  EmbeddedProviderEventMap,
  EventCallback,
} from "@phantom/embedded-provider-core";

export { AddressType } from "@phantom/client";
export { NetworkId } from "@phantom/constants";
