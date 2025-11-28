// Provider
export { PhantomProvider } from "./PhantomProvider";
export type { PhantomProviderProps, PhantomSDKConfig, PhantomDebugConfig, ConnectOptions } from "./PhantomProvider";

// Context
export { usePhantom } from "./PhantomContext";

// Hooks
export * from "./hooks";

// Components
export * from "./components";

// Theme - re-exported from @phantom/wallet-sdk-ui
export { darkTheme, lightTheme, mergeTheme } from "@phantom/wallet-sdk-ui";
export type { PhantomTheme, ComputedPhantomTheme, HexColor } from "@phantom/wallet-sdk-ui";

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
  InjectedWalletInfo,
  InjectedWalletId,
} from "@phantom/browser-sdk";

// Re-export chain interfaces
export type { ISolanaChain, IEthereumChain, EthTransactionRequest } from "@phantom/chain-interfaces";
