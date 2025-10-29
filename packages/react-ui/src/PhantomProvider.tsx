import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { useConnect as useBaseConnect, usePhantom, PhantomProvider as BasePhantomProvider, useIsExtensionInstalled, useIsPhantomLoginAvailable, type PhantomSDKConfig} from "@phantom/react-sdk";
import { isMobileDevice, getDeeplinkToPhantom } from "@phantom/browser-sdk";
import { getTheme, mergeTheme, type PhantomTheme } from "./themes";
import { Modal } from "./components/Modal";

export interface PhantomUIProviderProps {
  children: ReactNode;
  theme?: "light" | "dark" | "auto" | PhantomTheme;
  customTheme?: Partial<PhantomTheme>;
  config: PhantomSDKConfig;
  appIcon?: string; // URL to app icon
  appName?: string; // App name to display
}

// Connection UI state
interface ConnectionUIState {
  isVisible: boolean;
  isConnecting: boolean;
  error: Error | null;
  providerType: "injected" | "embedded" | "deeplink" | null;
}

interface PhantomUIContextValue {
  // Connection state
  connectionState: ConnectionUIState;
  showConnectionModal: () => void;
  hideConnectionModal: () => void;
  connectWithAuthProvider: (provider: "google" | "apple" | "phantom") => Promise<void>;
  connectWithInjected: () => Promise<void>;
  connectWithDeeplink: () => void;
  isMobile: boolean;
}

const PhantomUIContext = createContext<PhantomUIContextValue | null>(null);

// Internal UI Provider that consumes react-sdk context
function PhantomUIProvider({ children, theme = "dark", customTheme, appIcon, appName }: Omit<PhantomUIProviderProps, 'config'>) {
  const baseConnect = useBaseConnect();
  const { sdk, isPhantomAvailable: _isPhantomAvailable } = usePhantom();
  const isExtensionInstalled = useIsExtensionInstalled();
  const isPhantomLoginAvailable = useIsPhantomLoginAvailable();

  // Check if this is a mobile device
  const isMobile = useMemo(() => isMobileDevice(), []);

  // Get the resolved theme object
  const resolvedTheme = useMemo(() => {
    const baseTheme = typeof theme === 'string' ? getTheme(theme) : theme;
    return mergeTheme(baseTheme, customTheme);
  }, [theme, customTheme]);

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
    async (provider: "google" | "apple" | "phantom") => {
      try {
        setConnectionState(prev => ({
          ...prev,
          isConnecting: true,
          error: null,
          providerType: "embedded", // Always embedded when using modal
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
  };

  return (
    <PhantomUIContext.Provider value={contextValue}>
      {children}
      <Modal
        isVisible={connectionState.isVisible}
        isConnecting={connectionState.isConnecting}
        error={connectionState.error}
        providerType={connectionState.providerType}
        theme={resolvedTheme}
        appIcon={appIcon}
        appName={appName}
        isMobile={isMobile}
        isExtensionInstalled={isExtensionInstalled.isInstalled}
        isPhantomLoginAvailable={isPhantomLoginAvailable.isAvailable}
        onClose={hideConnectionModal}
        onConnectWithDeeplink={connectWithDeeplink}
        onConnectWithAuthProvider={connectWithAuthProvider}
        onConnectWithInjected={connectWithInjected}
      />
    </PhantomUIContext.Provider>
  );
}

// Main exported Provider that wraps both react-sdk and react-ui providers
export function PhantomProvider({ children, theme = "dark", customTheme, config, appIcon, appName }: PhantomUIProviderProps) {
  return (
    <BasePhantomProvider config={config}>
      <PhantomUIProvider theme={theme} customTheme={customTheme} appIcon={appIcon} appName={appName}>
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
