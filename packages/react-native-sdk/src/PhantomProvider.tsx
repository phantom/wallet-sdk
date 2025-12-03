import type { ReactNode } from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { EmbeddedProvider } from "@phantom/embedded-provider-core";
import type {
  EmbeddedProviderConfig,
  PlatformAdapter,
  ConnectEventData,
  ConnectResult,
} from "@phantom/embedded-provider-core";
import type { PhantomSDKConfig, PhantomDebugConfig, WalletAddress } from "./types";
import {
  ANALYTICS_HEADERS,
  DEFAULT_WALLET_API_URL,
  DEFAULT_EMBEDDED_WALLET_TYPE,
  DEFAULT_AUTH_URL,
} from "@phantom/constants";
import { ThemeProvider, darkTheme, type PhantomTheme } from "@phantom/wallet-sdk-ui";
import { ModalProvider } from "./ModalProvider";
import { PhantomContext, type PhantomContextValue, type PhantomErrors } from "./PhantomContext";
// Platform adapters for React Native/Expo
import { ExpoSecureStorage } from "./providers/embedded/storage";
import { ExpoAuthProvider } from "./providers/embedded/auth";
import { ExpoURLParamsAccessor } from "./providers/embedded/url-params";
import { ReactNativeStamper } from "./providers/embedded/stamper";
import { ExpoLogger } from "./providers/embedded/logger";
import { ReactNativePhantomAppProvider } from "./providers/embedded/phantom-app";
import { Platform } from "react-native";

export interface PhantomProviderProps {
  children: ReactNode;
  config: PhantomSDKConfig;
  debugConfig?: PhantomDebugConfig;
  theme?: Partial<PhantomTheme>;
  appIcon?: string;
  appName?: string;
}

export function PhantomProvider({ children, config, debugConfig, theme, appIcon, appName }: PhantomProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errors, setErrors] = useState<PhantomErrors>({});
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [user, setUser] = useState<ConnectResult | null>(null);

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
        ...(config.authOptions || {}),
        redirectUrl,
        authUrl: config.authOptions?.authUrl || DEFAULT_AUTH_URL,
      },
    };
  }, [config]);

  // Eager initialization - SDK created immediately and never null
  const sdk = useMemo(() => {
    // Create platform adapters
    const storage = new ExpoSecureStorage();
    const authProvider = new ExpoAuthProvider();
    const urlParamsAccessor = new ExpoURLParamsAccessor();
    const logger = new ExpoLogger(debugConfig?.enabled || false);
    const stamper = new ReactNativeStamper({
      keyPrefix: `phantom-rn-${memoizedConfig.appId}`,
      appId: memoizedConfig.appId,
    });

    const platformName = `${Platform.OS}-${Platform.Version}`;

    const platform: PlatformAdapter = {
      storage,
      authProvider,
      urlParamsAccessor,
      stamper,
      phantomAppProvider: new ReactNativePhantomAppProvider(),
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

    return new EmbeddedProvider(memoizedConfig, platform, logger);
  }, [memoizedConfig, debugConfig, config.appId, config.embeddedWalletType]);

  // Event listener management - SDK already exists
  useEffect(() => {
    // Event handlers that need to be referenced for cleanup
    const handleConnectStart = () => {
      setIsConnecting(true);
      setErrors((prev: PhantomErrors) => ({ ...prev, connect: undefined }));
    };

    const handleConnect = async (data: ConnectEventData) => {
      try {
        setIsConnected(true);
        setIsConnecting(false);

        // Store the full ConnectResult as user
        setUser(data);

        const addrs = await sdk.getAddresses();
        setAddresses(addrs);
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
      setErrors((prev: PhantomErrors) => ({ ...prev, connect: new Error(errorData.error || "Connection failed") }));
      setAddresses([]);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsConnecting(false);
      setErrors({});
      setAddresses([]);
      setWalletId(null);
      setUser(null);
    };

    const handleSpendingLimitReached = () => {
      setErrors((prev: PhantomErrors) => ({ ...prev, spendingLimit: true }));
    };

    // Add event listeners to SDK
    sdk.on("connect_start", handleConnectStart);
    sdk.on("connect", handleConnect);
    sdk.on("connect_error", handleConnectError);
    sdk.on("disconnect", handleDisconnect);
    sdk.on("spending_limit_reached", handleSpendingLimitReached);

    // Cleanup function to remove event listeners when SDK changes or component unmounts
    return () => {
      sdk.off("connect_start", handleConnectStart);
      sdk.off("connect", handleConnect);
      sdk.off("connect_error", handleConnectError);
      sdk.off("disconnect", handleDisconnect);
      sdk.off("spending_limit_reached", handleSpendingLimitReached);
    };
  }, [sdk]);

  // Initialize auto-connect
  useEffect(() => {
    sdk.autoConnect().catch(() => {
      // Silent fail - auto-connect shouldn't break the app
    });
  }, [sdk]);

  const clearError = useCallback((key: keyof PhantomErrors) => {
    setErrors(({ [key]: _, ...next }: PhantomErrors) => next);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value: PhantomContextValue = useMemo(
    () => ({
      sdk,
      isConnected,
      isConnecting,
      errors,
      addresses,
      walletId,
      setWalletId,
      user,
      allowedProviders: config.providers,
      clearError,
    }),
    [sdk, isConnected, isConnecting, errors, addresses, walletId, setWalletId, user, config.providers, clearError],
  );

  const resolvedTheme = theme || darkTheme;

  return (
    <ThemeProvider theme={resolvedTheme}>
      <PhantomContext.Provider value={value}>
        <ModalProvider appIcon={appIcon} appName={appName}>
          {children}
        </ModalProvider>
      </PhantomContext.Provider>
    </ThemeProvider>
  );
}
