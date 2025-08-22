import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { ReactNativeSDK } from "./ReactNativeSDK";
import type { PhantomSDKConfig, WalletAddress } from "./types";

interface PhantomContextValue {
  sdk: ReactNativeSDK;
  isConnected: boolean;
  addresses: WalletAddress[];
  walletId: string | null;
  error: Error | null;
  updateConnectionState: () => void;
  setWalletId: (walletId: string | null) => void;
}

const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export interface PhantomProviderProps {
  children: ReactNode;
  config: PhantomSDKConfig;
}

export function PhantomProvider({ children, config }: PhantomProviderProps) {
  // Create SDK with useMemo
  const sdk = useMemo(() => {
    return new ReactNativeSDK(config);
  }, [config]);

  const [isConnected, setIsConnected] = useState(false);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Function to update connection state
  const updateConnectionState = useCallback(() => {
    try {
      const connected = sdk.isConnected();
      setIsConnected(connected);

      if (connected) {
        const addrs = sdk.getAddresses();
        setAddresses(addrs);
        const wId = sdk.getWalletId();
        setWalletId(wId);
      } else {
        setAddresses([]);
        setWalletId(null);
      }
      
      // Clear error if connection state updated successfully
      setError(null);
    } catch (err) {
      console.error("[PhantomProvider] Error updating connection state", err);
      setError(err as Error);

      // Reset state if an error occurs
      setIsConnected(false);
      setAddresses([]);
      setWalletId(null);
    }
  }, [sdk]);

  // Set walletId (used by auth callback)
  const setWalletIdCallback = useCallback((newWalletId: string | null) => {
    setWalletId(newWalletId);
  }, []);

  // Update connection state when SDK changes
  useEffect(() => {
    updateConnectionState();
  }, [updateConnectionState]);

  const contextValue: PhantomContextValue = {
    sdk,
    isConnected,
    addresses,
    walletId,
    error,
    updateConnectionState,
    setWalletId: setWalletIdCallback,
  };

  return <PhantomContext.Provider value={contextValue}>{children}</PhantomContext.Provider>;
}

export function usePhantom(): PhantomContextValue {
  const context = useContext(PhantomContext);
  if (context === undefined) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}