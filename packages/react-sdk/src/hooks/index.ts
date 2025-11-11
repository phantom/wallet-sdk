// Connection management
export { useConnect } from "./useConnect";
export { useDisconnect } from "./useDisconnect";

// Modal management
export { useModal } from "./useModal";
export type { UseModalResult } from "./useModal";

// Account management
export { useAccounts } from "./useAccounts";

// Extension detection
export { useIsExtensionInstalled } from "./useIsExtensionInstalled";
export { useIsPhantomLoginAvailable } from "./useIsPhantomLoginAvailable";

// Auto-confirm functionality (injected provider only)
export { useAutoConfirm } from "./useAutoConfirm";

// Chain-specific hooks
export { useSolana } from "./useSolana";
export { useEthereum } from "./useEthereum";

// Theme management
export { useTheme } from "./useTheme";
