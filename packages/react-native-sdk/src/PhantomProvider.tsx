import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { EmbeddedProvider } from "@phantom/embedded-provider-core";
import type { EmbeddedProviderConfig, PlatformAdapter } from "@phantom/embedded-provider-core";
import type { PhantomSDKConfig, PhantomDebugConfig, WalletAddress } from "./types";
import {ANALYTICS_HEADERS, DEFAULT_WALLET_API_URL, DEFAULT_EMBEDDED_WALLET_TYPE, DEFAULT_AUTH_URL } from "@phantom/constants";
// Platform adapters for React Native/Expo
import { ExpoSecureStorage } from "./providers/embedded/storage";
import { ExpoAuthProvider } from "./providers/embedded/auth";
import { ExpoURLParamsAccessor } from "./providers/embedded/url-params";
import { ReactNativeStamper } from "./providers/embedded/stamper";
import { ExpoLogger } from "./providers/embedded/logger";
import { Platform } from "react-native";

interface PhantomContextValue {
  sdk: EmbeddedProvider | null;
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
  debugConfig?: PhantomDebugConfig;
}

export function PhantomProvider({ children, config, debugConfig }: PhantomProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<Error | null>(null);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [sdk, setSdk] = useState<EmbeddedProvider | null>(null);

  // Memoized config to avoid unnecessary SDK recreation
  const memoizedConfig: EmbeddedProviderConfig = useMemo(() => {
    // Build redirect URL if not provided
    const redirectUrl = config.authOptions?.redirectUrl || `${config.scheme}://phantom-auth-callback`;

    // Merge config with redirect URL
    return {
      ...config,
      apiBaseUrl: config.apiBaseUrl || DEFAULT_WALLET_API_URL,
      embeddedWalletType: config.embeddedWalletType || DEFAULT_EMBEDDED_WALLET_TYPE,
      authOptions: {
        ...(config.authOptions || {
        }),
        redirectUrl,
        authUrl: config.authOptions?.authUrl || DEFAULT_AUTH_URL,
      },
    };
  }, [config]);

  // SDK initialization and cleanup with proper event listener management
  useEffect(() => {
    // Create platform adapters
    const storage = new ExpoSecureStorage();
    const authProvider = new ExpoAuthProvider();
    const urlParamsAccessor = new ExpoURLParamsAccessor();
    const logger = new ExpoLogger(debugConfig?.enabled || false);
    const stamper = new ReactNativeStamper({
      keyPrefix: `phantom-rn-${memoizedConfig.organizationId}`,
      organizationId: memoizedConfig.organizationId,
    });

    const platformName = `${Platform.OS}-${Platform.Version}`;

    const platform: PlatformAdapter = {
      storage,
      authProvider,
      urlParamsAccessor,
      stamper,
      name: platformName,
      analyticsHeaders: {
        [ANALYTICS_HEADERS.SDK_TYPE]: "react-native",
        [ANALYTICS_HEADERS.PLATFORM]: Platform.OS,
        [ANALYTICS_HEADERS.PLATFORM_VERSION]: `${Platform.Version}`,
        [ANALYTICS_HEADERS.APP_ID]: config.appId,
        [ANALYTICS_HEADERS.WALLET_TYPE]: config.embeddedWalletType as "app-wallet" | "user-wallet",
        [ANALYTICS_HEADERS.SDK_VERSION]: __SDK_VERSION__, // Replaced at build time
      },
    };

    const sdkInstance = new EmbeddedProvider(memoizedConfig, platform, logger);

    // Event handlers that need to be referenced for cleanup
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
  }, [memoizedConfig, debugConfig, config.appId, config.embeddedWalletType]);

  // Initialize auto-connect
  useEffect(() => {
    if (!sdk) return;

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
    [sdk, isConnected, isConnecting, connectError, addresses, walletId, setWalletId],
  );

  return <PhantomContext.Provider value={value}>{children}</PhantomContext.Provider>;
}

export function usePhantom(): PhantomContextValue {
  const context = useContext(PhantomContext);
  if (context === undefined) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}
