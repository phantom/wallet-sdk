import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { BrowserSDK } from "@phantom/browser-sdk";
import type { BrowserSDKConfig, WalletAddress, AuthOptions, DebugConfig } from "@phantom/browser-sdk";

export interface PhantomSDKConfig extends BrowserSDKConfig {}

export interface PhantomDebugConfig extends DebugConfig {}

export interface ConnectOptions {
  providerType?: "injected" | "embedded";
  embeddedWalletType?: "app-wallet" | "user-wallet";
  authOptions?: AuthOptions;
}

interface PhantomContextValue {
  sdk: BrowserSDK | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectError: Error | null;
  addresses: WalletAddress[];
  walletId: string | null;
  currentProviderType: "injected" | "embedded" | null;
  isPhantomAvailable: boolean;
}

const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export interface PhantomProviderProps {
  children: ReactNode;
  config: PhantomSDKConfig;
  debugConfig?: PhantomDebugConfig;
}


export function PhantomProvider({ children, config, debugConfig }: PhantomProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<Error | null>(null);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [currentProviderType, setCurrentProviderType] = useState<"injected" | "embedded" | null>(config.providerType as any || null);
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);
  const [sdk, setSdk] = useState<BrowserSDK | null>(null);

  // Memoized config to avoid unnecessary SDK recreation
  const memoizedConfig: BrowserSDKConfig = useMemo(() => {
    return {
      ...config,
      // Use providerType if provided, default to embedded
      providerType: config.providerType || "embedded",
    };
  }, [config]);

  // SDK initialization and cleanup with event listener management
  useEffect(() => {
    const sdkInstance = new BrowserSDK(memoizedConfig);
    
    // Event handlers that need to be referenced for cleanup
    const handleConnectStart = () => {
      setIsConnecting(true);
      setConnectError(null);
    };

    const handleConnect = async () => {
      try {
        setIsConnected(true);
        setIsConnecting(false);
        
        // Update current provider type
        const providerInfo = sdkInstance.getCurrentProviderInfo();
        setCurrentProviderType(providerInfo?.type || null);
        
        const addrs = await sdkInstance.getAddresses();
        setAddresses(addrs);
        setWalletId(sdkInstance.getWalletId());
      } catch (err) {
        console.error("Error connecting:", err);
        
        // Call disconnect to reset state if an error occurs
        try {
          await sdkInstance.disconnect();
        } catch (err) {
          console.error("Error disconnecting:", err);
        }
      }
    };

    const handleConnectError = (errorData: any) => {
      setIsConnecting(false);
      setIsConnected(false);
      setConnectError(new Error(errorData.error || "Connection failed"));
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectError(null);
      setAddresses([]);
      setWalletId(null);
    };
    
    // Add event listeners immediately when SDK is created to avoid race conditions
    sdkInstance.on("connect_start", handleConnectStart);
    sdkInstance.on("connect", handleConnect);
    sdkInstance.on("connect_error", handleConnectError);
    sdkInstance.on("disconnect", handleDisconnect);
    
    setSdk(sdkInstance);

    // Cleanup function to remove event listeners when SDK is recreated or component unmounts
    return () => {
      sdkInstance.off("connect_start", handleConnectStart);
      sdkInstance.off("connect", handleConnect);
      sdkInstance.off("connect_error", handleConnectError);
      sdkInstance.off("disconnect", handleDisconnect);
    };
  }, [memoizedConfig]);

  // Handle debug configuration changes separately to avoid SDK reinstantiation
  useEffect(() => {
    if (!sdk || !debugConfig) return;

    sdk.configureDebug(debugConfig);
  }, [sdk, debugConfig]);

  // Initialize connection state and auto-connect
  useEffect(() => {
    if (!sdk) return;

    const initialize = async () => {
      // Check if Phantom extension is available (only for injected provider)
      try {
        const available = await sdk.waitForPhantomExtension(1000);
        setIsPhantomAvailable(available);
      } catch (err) {
        console.error("Error checking Phantom extension:", err);
        setIsPhantomAvailable(false);
      }
      
      // Attempt auto-connect if enabled
      if (config.autoConnect !== false) {
        sdk.autoConnect().catch(() => {
          // Silent fail - auto-connect is optional and shouldn't break the app
        });
      }
    };

    initialize();
  }, [sdk, config.autoConnect]);

  // Memoize context value to prevent unnecessary re-renders
  const value: PhantomContextValue = useMemo(
    () => ({
      sdk,
      isConnected,
      isConnecting,
      connectError,
      addresses,
      walletId,
      currentProviderType,
      isPhantomAvailable,
    }),
    [
      sdk,
      isConnected,
      isConnecting,
      connectError,
      addresses,
      walletId,
      currentProviderType,
      isPhantomAvailable,
    ]
  );

  return <PhantomContext.Provider value={value}>{children}</PhantomContext.Provider>;
}

export function usePhantom() {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}
