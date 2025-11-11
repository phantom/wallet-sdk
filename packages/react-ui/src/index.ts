// Phantom React UI Package
// Provides UI components and enhanced hooks for the Phantom Wallet SDK with modal-based interactions

// Main Provider
export { PhantomProvider, type PhantomUIProviderProps } from "./PhantomProvider";

// Hooks
export { useTheme } from "./hooks/useTheme";

// UI Components
export {
  Button,
  LoginWithPhantomButton,
  type ButtonProps,
  type LoginWithPhantomButtonProps,
} from "./components/Button";

// Enhanced Hooks with UI integration
export * from "./hooks";

// Theme system
export { type PhantomTheme, type HexColor, darkTheme, lightTheme } from "./themes";

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
  type PhantomSDKConfig,
} from "@phantom/react-sdk";

// Re-export client types
export type { NetworkId } from "@phantom/client";

export { isMobileDevice, getDeeplinkToPhantom } from "@phantom/browser-sdk";
