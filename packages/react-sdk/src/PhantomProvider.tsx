import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { BrowserSDK } from "@phantom/browser-sdk";
import type { BrowserSDKConfig, WalletAddress, AuthOptions } from "@phantom/browser-sdk";

export interface PhantomSDKConfig extends BrowserSDKConfig {}

export interface ConnectOptions {
  providerType?: "injected" | "embedded";
  embeddedWalletType?: "app-wallet" | "user-wallet";
  authOptions?: AuthOptions;
}

interface PhantomContextValue {
  sdk: BrowserSDK;
  isConnected: boolean;
  addresses: WalletAddress[];
  walletId: string | null;
  error: Error | null;
  currentProviderType: "injected" | "embedded" | null;
  isPhantomAvailable: boolean;
  updateConnectionState: () => Promise<void>;
}

const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export interface PhantomProviderProps {
  children: ReactNode;
  config: PhantomSDKConfig;
}

export function PhantomProvider({ children, config }: PhantomProviderProps) {
  // Instantiate SDK with useMemo to avoid recreation on every render
  const sdk = useMemo(
    () =>
      new BrowserSDK({
        ...config,
        // Use providerType if provided, default to embedded
        providerType: config.providerType || "embedded",
      }),
    [config],
  );

  const [isConnected, setIsConnected] = useState(false);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [currentProviderType, setCurrentProviderType] = useState<"injected" | "embedded" | null>(null);
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);

  // Check if Phantom extension is available (only for injected provider)
  useEffect(() => {
    const checkPhantomExtension = async () => {
      try {
        const available = await sdk.waitForPhantomExtension(1000);
        setIsPhantomAvailable(available);
      } catch (err) {
        console.error("Error checking Phantom extension:", err);
        setIsPhantomAvailable(false);
      }
    };

    checkPhantomExtension();
  }, [sdk]);

  // Function to update connection state and provider info
  const updateConnectionState = useCallback(async () => {
    try {
      const connected = sdk.isConnected();
      setIsConnected(connected);

      // Update current provider type
      const providerInfo = sdk.getCurrentProviderInfo();
      setCurrentProviderType(providerInfo?.type || null);

      if (connected) {
        const addrs = await sdk.getAddresses();
        setAddresses(addrs);
        setWalletId(sdk.getWalletId());
      } else {
        setAddresses([]);
        setWalletId(null);
      }
    } catch (err) {
      console.error("Error updating connection state:", err);
      setError(err as Error);
    }
  }, [sdk]);

  // Initialize connection state
  useEffect(() => {
    updateConnectionState();
  }, [updateConnectionState]);

  const value: PhantomContextValue = {
    sdk,
    isConnected,
    addresses,
    updateConnectionState,
    walletId,
    error,
    currentProviderType,
    isPhantomAvailable,
  };

  return <PhantomContext.Provider value={value}>{children}</PhantomContext.Provider>;
}

export function usePhantom() {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}
