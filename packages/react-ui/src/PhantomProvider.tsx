import React, { useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import {
  useConnect as useBaseConnect,
  usePhantom,
  PhantomProvider as BasePhantomProvider,
  type PhantomSDKConfig,
} from "@phantom/react-sdk";
import { isMobileDevice, getDeeplinkToPhantom, type AuthProviderType } from "@phantom/browser-sdk";
import { darkTheme, mergeTheme, type PhantomTheme } from "./themes";
import { Modal } from "./components/Modal";
import { PhantomUIContext, type PhantomUIContextValue, type ConnectionUIState } from "./context";

export interface PhantomUIProviderProps {
  children: ReactNode;
  theme?: Partial<PhantomTheme>;
  config: PhantomSDKConfig;
  appIcon?: string; // URL to app icon
  appName?: string; // App name to display
}

// Internal UI Provider that consumes react-sdk context
function PhantomUIProvider({ children, theme = darkTheme, appIcon, appName }: Omit<PhantomUIProviderProps, "config">) {
  const baseConnect = useBaseConnect();
  const { sdk } = usePhantom();

  // Check if this is a mobile device
  const isMobile = useMemo(() => isMobileDevice(), []);

  // Get the resolved theme object
  const resolvedTheme = useMemo(() => {
    return mergeTheme(theme);
  }, [theme]);

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionUIState>({
    isVisible: false,
    isConnecting: false,
    error: null,
    providerType: null,
  });

  // Show connection modal
  const showConnectionModal = useCallback(() => {
    setConnectionState({
      isVisible: true,
      isConnecting: false,
      error: null,
      providerType: null,
    });
  }, []);

  // Hide connection modal
  const hideConnectionModal = useCallback(() => {
    setConnectionState(prev => ({
      ...prev,
      isVisible: false,
      isConnecting: false,
    }));
  }, []);

  // Connect with specific auth provider
  const connectWithAuthProvider = useCallback(
    async (provider: AuthProviderType) => {
      try {
        setConnectionState(prev => ({
          ...prev,
          isConnecting: true,
          error: null,
          providerType: provider,
        }));

        await baseConnect.connect({ provider });

        // Hide modal on successful connection
        setConnectionState({
          isVisible: false,
          isConnecting: false,
          error: null,
          providerType: null,
        });
      } catch (error) {
        setConnectionState(prev => ({
          ...prev,
          isConnecting: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    [baseConnect],
  );

  // Connect with injected provider (when extension is installed)
  const connectWithInjected = useCallback(async () => {
    if (!sdk) {
      const error = new Error("SDK not initialized");
      setConnectionState(prev => ({
        ...prev,
        error,
      }));
      throw error;
    }

    try {
      setConnectionState(prev => ({
        ...prev,
        isConnecting: true,
        error: null,
        providerType: "injected",
      }));

      await baseConnect.connect({
        provider: "injected",
      });

      // Hide modal on successful connection
      setConnectionState({
        isVisible: false,
        isConnecting: false,
        error: null,
        providerType: null,
      });
    } catch (error) {
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        error: error as Error,
      }));
      throw error;
    }
  }, [sdk, baseConnect]);

  // Connect with deeplink (redirect to Phantom mobile app)
  const connectWithDeeplink = useCallback(() => {
    try {
      setConnectionState(prev => ({
        ...prev,
        isConnecting: true,
        error: null,
        providerType: "deeplink",
      }));

      // Generate and redirect to deeplink URL
      const deeplinkUrl = getDeeplinkToPhantom();

      window.location.href = deeplinkUrl;

      // This code will likely never be reached due to the redirect
      setConnectionState({
        isVisible: false,
        isConnecting: false,
        error: null,
        providerType: null,
      });
    } catch (error) {
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        error: error as Error,
      }));
      throw error;
    }
  }, []);

  const contextValue: PhantomUIContextValue = {
    connectionState,
    showConnectionModal,
    hideConnectionModal,
    connectWithAuthProvider,
    connectWithInjected,
    connectWithDeeplink,
    isMobile,
    theme: resolvedTheme,
  };

  return (
    <PhantomUIContext.Provider value={contextValue}>
      {children}
      <Modal appIcon={appIcon} appName={appName} />
    </PhantomUIContext.Provider>
  );
}

// Main exported Provider that wraps both react-sdk and react-ui providers
export function PhantomProvider({ children, theme = darkTheme, config, appIcon, appName }: PhantomUIProviderProps) {
  return (
    <BasePhantomProvider config={config}>
      <PhantomUIProvider theme={theme} appIcon={appIcon} appName={appName}>
        {children}
      </PhantomUIProvider>
    </BasePhantomProvider>
  );
}

export function usePhantomUI(): PhantomUIContextValue {
  const context = useContext(PhantomUIContext);
  if (!context) {
    throw new Error("usePhantomUI must be used within a PhantomProvider");
  }
  return context;
}
