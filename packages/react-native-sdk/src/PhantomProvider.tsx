import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { EmbeddedProvider } from "@phantom/embedded-provider-core";
import type { PlatformAdapter } from "@phantom/embedded-provider-core";
import type { PhantomSDKConfig, WalletAddress } from "./types";

// Platform adapters for React Native/Expo
import { ExpoSecureStorage } from "./providers/embedded/storage";
import { ExpoAuthProvider } from "./providers/embedded/auth";
import { ExpoURLParamsAccessor } from "./providers/embedded/url-params";
import { ExpoLogger } from "./providers/embedded/logger";
import { ReactNativeStamper } from "./providers/embedded/stamper";
import { Platform } from "react-native";

interface PhantomContextValue {
  sdk: EmbeddedProvider;
  isConnected: boolean;
  isConnecting: boolean;
  connectError: Error | null;
  addresses: WalletAddress[];
  walletId: string | null;
  setWalletId: (walletId: string | null) => void;
}

const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export interface PhantomProviderProps {
  children: ReactNode;
  config: PhantomSDKConfig;
}

export function PhantomProvider({ children, config }: PhantomProviderProps) {
  // Create platform adapters and SDK with useMemo
  const sdk = useMemo(() => {
    // Build redirect URL if not provided
    const redirectUrl = config.authOptions?.redirectUrl || `${config.scheme}://phantom-auth-callback`;

    // Merge config with redirect URL
    const embeddedConfig: PhantomSDKConfig = {
      ...config,
      authOptions: {
        ...config.authOptions || {},
        redirectUrl,
      },
    };

    // Create platform adapters
    const storage = new ExpoSecureStorage();
    const authProvider = new ExpoAuthProvider();
    const urlParamsAccessor = new ExpoURLParamsAccessor();
    const logger = new ExpoLogger(config.debug);
    const stamper = new ReactNativeStamper({
      keyPrefix: `phantom-rn-${config.organizationId}`,
      organizationId: config.organizationId,
    });

    const platform: PlatformAdapter = {
      storage,
      authProvider,
      urlParamsAccessor,
      stamper,
      name: `${Platform.OS}-${Platform.Version}`,
    };

    const sdkInstance = new EmbeddedProvider(embeddedConfig, platform, logger);
    
    // Set up event listeners immediately when SDK is created to avoid race conditions
    const handleConnectStart = () => {
      setIsConnecting(true);
      setConnectError(null);
    };

    const handleConnect = async () => {
      try {
        setIsConnected(true);
        setIsConnecting(false);
        const addrs = await sdkInstance.getAddresses();
        setAddresses(addrs);
      } catch (err) {
        console.error("Error updating connection state:", err);
        
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
    
    return sdkInstance;
  }, [config]);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<Error | null>(null);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);


  // Initialize auto-connect
  useEffect(() => {
    // Attempt auto-connect if enabled
    if (config.autoConnect !== false) {
      sdk.autoConnect().catch(() => {
        // Silent fail - auto-connect is optional and shouldn't break the app
      });
    }
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
      setWalletId,
    }),
    [
      sdk,
      isConnected,
      isConnecting,
      connectError,
      addresses,
      walletId,
      setWalletId,
    ]
  );

  return <PhantomContext.Provider value={value}>{children}</PhantomContext.Provider>;
}

/**
 * Hook to access the Phantom context
 * Must be used within a PhantomProvider
 */
export function usePhantom(): PhantomContextValue {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}
