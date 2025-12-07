// Main SDK
export { BrowserSDK } from "./BrowserSDK";

// Chain interfaces (from shared package)
export type { ISolanaChain, IEthereumChain, EthTransactionRequest } from "@phantom/chain-interfaces";

// Types
export * from "./types";

// Debug system
export { debug, DebugLevel, DebugCategory } from "./debug";
export type { DebugMessage, DebugCallback } from "./debug";

// Utility functions
export {
  detectBrowser,
  parseBrowserFromUserAgent,
  getPlatformName,
  getBrowserDisplayName,
  isMobileDevice,
} from "./utils/browser-detection";
export type { BrowserInfo } from "./utils/browser-detection";

export { getDeeplinkToPhantom } from "./utils/deeplink";

// Extension detection
export { waitForPhantomExtension } from "./waitForPhantomExtension";
export { isPhantomLoginAvailable } from "./isPhantomLoginAvailable";

// Re-export useful types from constants and client
export { NetworkId } from "@phantom/constants";
export { AddressType } from "@phantom/client";

// Re-export auto-confirm types
export type {
  AutoConfirmEnableParams,
  AutoConfirmResult,
  AutoConfirmSupportedChainsResult,
} from "@phantom/browser-injected-sdk/auto-confirm";

// Re-export event types for typed event handlers
export type {
  EmbeddedProviderEvent,
  ConnectEventData,
  ConnectStartEventData,
  ConnectErrorEventData,
  DisconnectEventData,
  EmbeddedProviderEventMap,
  EventCallback,
} from "@phantom/embedded-provider-core";

export type { InjectedWalletInfo, InjectedWalletId } from "./wallets/registry";
