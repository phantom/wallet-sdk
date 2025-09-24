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

// SecureWebView types and components (re-export for convenience)
export type {
  WebViewState,
  SecureWebViewConfig,
  NavigationResult,
  SecurityViolation,
  SecureWebViewCallbacks
} from "@phantom/secure-webview";

export { AddressType } from "@phantom/client";
export { NetworkId } from "@phantom/constants";
