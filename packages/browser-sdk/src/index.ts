// Main SDK
export { BrowserSDK } from "./BrowserSDK";

// Types
export * from "./types";

// Constants
export * from "./constants";

// Debug system
export { debug, DebugLevel, DebugCategory } from "./debug";
export type { DebugMessage, DebugCallback } from "./debug";

// Utility functions
export {
  detectBrowser,
  parseBrowserFromUserAgent,
  getPlatformName,
  getBrowserDisplayName,
} from "./utils/browser-detection";
export type { BrowserInfo } from "./utils/browser-detection";

// Re-export useful types from constants and client
export { NetworkId } from "@phantom/constants";
export { AddressType } from "@phantom/client";
