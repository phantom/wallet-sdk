// Connection management
export { useConnect } from "./useConnect";
export { useDisconnect } from "./useDisconnect";

// Modal management
export { useModal } from "../ModalContext";

export interface UseModalResult {
  open: () => void;
  close: () => void;
  isOpened: boolean;
}

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

// Wallet discovery
export { useDiscoveredWallets } from "./useDiscoveredWallets";
export type { UseDiscoveredWalletsResult } from "./useDiscoveredWallets";

// Theme management - exported from @phantom/wallet-sdk-ui
export { useTheme } from "@phantom/wallet-sdk-ui";
