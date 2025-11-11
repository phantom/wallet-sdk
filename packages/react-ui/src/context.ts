import { createContext } from "react";
import type { AuthProviderType } from "@phantom/browser-sdk";
import type { CompletePhantomTheme } from "./themes";

// Connection UI state
export interface ConnectionUIState {
  isVisible: boolean;
  isConnecting: boolean;
  error: Error | null;
  providerType: AuthProviderType | "deeplink" | null;
}

export interface PhantomUIContextValue {
  // Connection state
  connectionState: ConnectionUIState;
  showConnectionModal: () => void;
  hideConnectionModal: () => void;
  connectWithAuthProvider: (provider: AuthProviderType) => Promise<void>;
  connectWithInjected: () => Promise<void>;
  connectWithDeeplink: () => void;
  isMobile: boolean;
  // Theme
  theme: CompletePhantomTheme;
}

export const PhantomUIContext = createContext<PhantomUIContextValue | null>(null);
