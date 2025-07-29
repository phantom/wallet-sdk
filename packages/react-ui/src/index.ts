// Phantom React UI Package
// Provides UI components and enhanced hooks for the Phantom Wallet SDK with modal-based interactions

// Main Provider
export * from "./PhantomUIProvider";

// Enhanced Hooks with UI integration
export * from "./hooks";

// UI Components
export * from "./components";

// Re-export base hooks and types from react-sdk for convenience
// Note: useConnect, useSignAndSendTransaction, useSignMessage are overridden by UI hooks
export {
  useAccounts,
  useDisconnect,
  PhantomProvider,
  type ConnectOptions,
  type ProviderType,
} from "@phantom/react-sdk";

// Re-export client types
export type { NetworkId } from "@phantom/client";

// Import and auto-inject CSS styles
import "./styles.css";
