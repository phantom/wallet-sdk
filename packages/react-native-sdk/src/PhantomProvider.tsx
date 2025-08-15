import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
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
  // Create platform adapters and SDK with useMemo
  const sdk = useMemo(() => {
    // Build redirect URL if not provided
    const redirectUrl = config.authOptions?.redirectUrl || `${config.scheme}://phantom-auth-callback`;

    // Convert React Native config to embedded provider config
    const embeddedConfig = {
      apiBaseUrl: config.apiBaseUrl,
      organizationId: config.organizationId,
      authOptions: {
        ...config.authOptions,
        redirectUrl,
      },
      embeddedWalletType: config.embeddedWalletType,
      addressTypes: config.addressTypes,
      solanaProvider: config.solanaProvider || "web3js",
      appName: config.appName,
      appLogo: config.appLogo, // Optional app logo URL
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

    return new EmbeddedProvider(embeddedConfig, platform, logger);
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
        // walletId is managed internally by the SDK and not directly accessible
        // It's typically only available after a successful connect operation
      } else {
        setAddresses([]);
        setWalletId(null);
      }
    } catch (err) {
      console.error("[PhantomProvider] Error updating connection state", err);
      setError(err as Error);

      // Call disconnect to reset state if an error occurs
      try {
        sdk.disconnect();
        setIsConnected(false);
        setAddresses([]);
        setWalletId(null);
      } catch (disconnectErr) {
        console.error("[PhantomProvider] Error disconnecting after error", disconnectErr);
      }
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
    walletId,
    error,
    updateConnectionState,
    setWalletId,
  };

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
