// Provider
export { PhantomProvider } from "./PhantomProvider";
export type { PhantomProviderProps, PhantomSDKConfig, PhantomDebugConfig, ConnectOptions } from "./PhantomProvider";

// Context
export { usePhantom } from "./PhantomContext";

// Hooks
export * from "./hooks";

// Components
export * from "./components";

// Theme
export { darkTheme, lightTheme, mergeTheme } from "./themes";
export type { PhantomTheme, CompletePhantomTheme, HexColor } from "./themes";

// Types
export * from "./types";

// Re-export useful types and utilities from browser-sdk
export { NetworkId, AddressType, DebugLevel, debug, isMobileDevice } from "@phantom/browser-sdk";

export type {
  EmbeddedProviderEvent,
  ConnectEventData,
  ConnectStartEventData,
  ConnectErrorEventData,
  DisconnectEventData,
  EmbeddedProviderEventMap,
  EventCallback,
  DebugMessage,
  AutoConfirmEnableParams,
  AutoConfirmResult,
  AutoConfirmSupportedChainsResult,
  AuthOptions,
} from "@phantom/browser-sdk";

// Re-export chain interfaces
export type { ISolanaChain, IEthereumChain, EthTransactionRequest } from "@phantom/chain-interfaces";
