import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { BrowserSDK } from "@phantom/browser-sdk";
import type { BrowserSDKConfig, WalletAddress, AuthOptions, DebugConfig } from "@phantom/browser-sdk";

export type PhantomSDKConfig = BrowserSDKConfig;

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
  isClient: boolean;
}

const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export interface PhantomProviderProps {
  children: ReactNode;
  config: PhantomSDKConfig;
  debugConfig?: PhantomDebugConfig;
}

export function PhantomProvider({ children, config, debugConfig }: PhantomProviderProps) {
  // Memoized config to avoid unnecessary SDK recreation
  const memoizedConfig: BrowserSDKConfig = useMemo(() => config, [config]);

  const [sdk, setSdk] = useState<BrowserSDK | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<Error | null>(null);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [currentProviderType, setCurrentProviderType] = useState<"injected" | "embedded" | null>(
    (memoizedConfig.providerType as any) || null,
  );
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);

  // Initialize client flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create SDK only on client side
  useEffect(() => {
    if (!isClient) return;

    const sdkInstance = new BrowserSDK(memoizedConfig);
    setSdk(sdkInstance);

    return () => {
      // Cleanup SDK if needed
      sdkInstance.disconnect().catch(() => {
        // Silent fail on cleanup
      });
    };
  }, [isClient, memoizedConfig]);

  // Event listener management - only when SDK exists
  useEffect(() => {
    if (!sdk) return;
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
        const providerInfo = sdk.getCurrentProviderInfo();
        setCurrentProviderType(providerInfo?.type || null);

        const addrs = await sdk.getAddresses();
        setAddresses(addrs);
        setWalletId(sdk.getWalletId());
      } catch (err) {
        console.error("Error connecting:", err);

        // Call disconnect to reset state if an error occurs
        try {
          await sdk.disconnect();
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

    // Add event listeners to SDK
    sdk.on("connect_start", handleConnectStart);
    sdk.on("connect", handleConnect);
    sdk.on("connect_error", handleConnectError);
    sdk.on("disconnect", handleDisconnect);

    // Cleanup function to remove event listeners when SDK changes or component unmounts
    return () => {
      sdk.off("connect_start", handleConnectStart);
      sdk.off("connect", handleConnect);
      sdk.off("connect_error", handleConnectError);
      sdk.off("disconnect", handleDisconnect);
    };
  }, [sdk]);

  // Handle debug configuration changes separately to avoid SDK reinstantiation
  useEffect(() => {
    if (!debugConfig || !sdk) return;

    sdk.configureDebug(debugConfig);
  }, [sdk, debugConfig]);

  // Initialize connection state and auto-connect - only on client side
  useEffect(() => {
    // Skip initialization if not on client or SDK not ready
    if (!isClient || !sdk) return;

    const initialize = async () => {
      // Check if Phantom extension is available (only for injected provider)
      try {
        const available = await BrowserSDK.isPhantomInstalled();
        setIsPhantomAvailable(available);
      } catch (err) {
        console.error("Error checking Phantom extension:", err);
        setIsPhantomAvailable(false);
      }

      // Attempt auto-connect if enabled
      if (memoizedConfig.autoConnect !== false) {
        sdk.autoConnect().catch(() => {
          // Silent fail - auto-connect is optional and shouldn't break the app
        });
      }
    };

    initialize();
  }, [sdk, memoizedConfig.autoConnect, isClient]);

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
      isClient,
    }),
    [sdk, isConnected, isConnecting, connectError, addresses, walletId, currentProviderType, isPhantomAvailable, isClient],
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
