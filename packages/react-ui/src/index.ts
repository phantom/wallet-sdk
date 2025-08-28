// Phantom React UI Package
// Provides UI components and enhanced hooks for the Phantom Wallet SDK with modal-based interactions

// Main Provider
export * from "./PhantomUIProvider";

// Enhanced Hooks with UI integration
export * from "./hooks";


// Re-export hooks and types from react-sdk (useConnect is overridden by UI hooks)
export {
  useAccounts,
  useDisconnect,
  useSolana,
  useEthereum,
  PhantomProvider,
  usePhantom,
  useIsExtensionInstalled,
  useAutoConfirm,
  type ConnectOptions,
  type ProviderType,
} from "@phantom/react-sdk";

// Re-export client types
export type { NetworkId } from "@phantom/client";

// Import and auto-inject CSS styles
import "./styles.css";
