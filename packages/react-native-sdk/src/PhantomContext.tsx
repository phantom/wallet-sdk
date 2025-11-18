import { createContext, useContext } from "react";
import type { EmbeddedProvider, ConnectResult, EmbeddedProviderAuthType } from "@phantom/embedded-provider-core";
import type { WalletAddress } from "./types";

export interface PhantomContextValue {
  sdk: EmbeddedProvider;
  isConnected: boolean;
  isConnecting: boolean;
  connectError: Error | null;
  addresses: WalletAddress[];
  walletId: string | null;
  setWalletId: (walletId: string | null) => void;
  user: ConnectResult | null;
  allowedProviders: EmbeddedProviderAuthType[];
  spendingLimitError: boolean;
  clearSpendingLimitError: () => void;
}

export const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export function usePhantom(): PhantomContextValue {
  const context = useContext(PhantomContext);
  if (context === undefined) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}
