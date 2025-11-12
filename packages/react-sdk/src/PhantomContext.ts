import { createContext, useContext } from "react";
import type { BrowserSDK, WalletAddress, ConnectResult, AuthProviderType } from "@phantom/browser-sdk";
import type { CompletePhantomTheme } from "./themes";

export interface PhantomContextValue {
  sdk: BrowserSDK | null;
  isConnected: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  connectError: Error | null;
  addresses: WalletAddress[];
  isClient: boolean;
  user: ConnectResult | null;
  theme: CompletePhantomTheme;
  allowedProviders: AuthProviderType[];
}

export const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export function usePhantom() {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}
