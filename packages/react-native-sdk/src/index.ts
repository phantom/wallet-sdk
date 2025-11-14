// Main provider and context
export { PhantomProvider } from "./PhantomProvider";
export { usePhantom } from "./PhantomContext";
export { useModal } from "./ModalContext";

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

// Theme exports - re-export from UI package for convenience
export { darkTheme, lightTheme } from "@phantom/wallet-sdk-ui";
export type { PhantomTheme } from "@phantom/wallet-sdk-ui";
