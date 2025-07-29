import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserSDK } from "@phantom/browser-sdk";
import type { BrowserSDKConfig, WalletAddress } from "@phantom/browser-sdk";

export interface PhantomSDKConfig extends BrowserSDKConfig {}

export interface ConnectOptions {
  providerType?: "injected" | "embedded";
  embeddedWalletType?: "app-wallet" | "user-wallet";
}

interface PhantomContextValue {
  sdk: BrowserSDK | null;
  isConnected: boolean;
  addresses: WalletAddress[];
  walletId: string | null;
  isReady: boolean;
  error: Error | null;
  currentProviderType: "injected" | "embedded" | null;
  isPhantomAvailable: boolean;
}

const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export interface PhantomProviderProps {
  children: ReactNode;
  config: PhantomSDKConfig;
}

export function PhantomProvider({ children, config }: PhantomProviderProps) {
  const [sdk, setSdk] = useState<BrowserSDK | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentProviderType, setCurrentProviderType] = useState<"injected" | "embedded" | null>(null);
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);

  useEffect(() => {
    try {
      const browserConfig: BrowserSDKConfig = {
        ...config,
        // Use providerType if provided, default to embedded
        providerType: config.providerType || "embedded",
      };

      const browserSDK = new BrowserSDK(browserConfig);
      setSdk(browserSDK);

      // Set initial provider type
      const initialProviderInfo = browserSDK.getCurrentProviderInfo();
      setCurrentProviderType(initialProviderInfo?.type || null);

      // Check Phantom availability
      const checkPhantom = async () => {
        const available = await browserSDK.waitForPhantomExtension(1000);
        setIsPhantomAvailable(available);
      };
      checkPhantom();

      setIsReady(true);
    } catch (err) {
      setError(err as Error);
      setIsReady(true);
    }
  }, [config]);

  // Function to update connection state and provider info
  const updateConnectionState = useCallback(async () => {
    if (sdk) {
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
      }
    }
  }, [sdk]);

  // Update connection state when SDK changes
  useEffect(() => {
    updateConnectionState();
  }, [updateConnectionState]);

  // Expose a method to trigger state updates after connection changes
  useEffect(() => {
    if (sdk) {
      // Attach update function to SDK instance for hooks to use
      (sdk as any)._updateConnectionState = updateConnectionState;
    }
  }, [sdk, updateConnectionState]);

  const value: PhantomContextValue = {
    sdk,
    isConnected,
    addresses,
    walletId,
    isReady,
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
