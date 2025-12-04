import { createContext, useContext } from "react";
import type { BrowserSDK, WalletAddress, ConnectResult, AuthProviderType } from "@phantom/browser-sdk";
import type { PhantomTheme } from "@phantom/wallet-sdk-ui";

export interface PhantomErrors {
  connect?: Error;
  spendingLimit?: boolean;
}

export interface PhantomContextValue {
  sdk: BrowserSDK | null;
  isConnected: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  errors: PhantomErrors;
  addresses: WalletAddress[];
  isClient: boolean;
  user: ConnectResult | null;
  theme: PhantomTheme;
  allowedProviders: AuthProviderType[];
  clearError: (key: keyof PhantomErrors) => void;
}

export const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export function usePhantom() {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}
