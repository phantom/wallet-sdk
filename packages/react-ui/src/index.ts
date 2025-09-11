// Phantom React UI Package
// Provides UI components and enhanced hooks for the Phantom Wallet SDK with modal-based interactions

// Main Provider
export {PhantomProvider, type PhantomUIProviderProps} from "./PhantomProvider";

// Enhanced Hooks with UI integration
export * from "./hooks";

// Re-export hooks and types from react-sdk (useConnect is overridden by UI hooks)
export {
  useAccounts,
  useDisconnect,
  useSolana,
  useEthereum,
  usePhantom,
  useIsExtensionInstalled,
  useAutoConfirm,
  type ConnectOptions,
  type ProviderType,
  AddressType,
  type PhantomSDKConfig
} from "@phantom/react-sdk";

// Re-export client types
export type { NetworkId } from "@phantom/client";

export { isMobileDevice, getDeeplinkToPhantom } from "@phantom/browser-sdk";

// Import and auto-inject CSS styles
import "./styles.css";
