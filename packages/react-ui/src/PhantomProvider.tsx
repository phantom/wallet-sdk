import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { useConnect as useBaseConnect, usePhantom, PhantomProvider as BasePhantomProvider, useIsExtensionInstalled, useIsPhantomLoginAvailable, type PhantomSDKConfig} from "@phantom/react-sdk";
import { isMobileDevice, getDeeplinkToPhantom } from "@phantom/browser-sdk";

export interface PhantomUIProviderProps {
  children: ReactNode;
  theme?: "light" | "dark" | "auto";
  customTheme?: Record<string, string>;
  config: PhantomSDKConfig;
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
function PhantomUIProvider({ children, theme = "light", customTheme }: Omit<PhantomUIProviderProps, 'config'>) {
  const baseConnect = useBaseConnect();
  const { sdk, isPhantomAvailable: _isPhantomAvailable } = usePhantom();
  const isExtensionInstalled = useIsExtensionInstalled();
  const isPhantomLoginAvailable = useIsPhantomLoginAvailable();

  // Check if this is a mobile device
  const isMobile = useMemo(() => isMobileDevice(), []);

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
      {/* Connection Modal - rendered conditionally based on state */}
      {connectionState.isVisible && (
        <div className={`phantom-ui-modal-overlay ${theme}`} style={customTheme} onClick={hideConnectionModal}>
          <div className="phantom-ui-modal-content" onClick={e => e.stopPropagation()}>
            <div className="phantom-ui-modal-header">
              <h3>Connect to Phantom</h3>
              <button className="phantom-ui-close-button" onClick={hideConnectionModal}>
                ×
              </button>
            </div>

            <div className="phantom-ui-modal-body">
              {connectionState.error && <div className="phantom-ui-error">{connectionState.error.message}</div>}

              <div className="phantom-ui-provider-options">
                {/* Mobile device with no Phantom extension - show deeplink button */}
                {isMobile && !isExtensionInstalled.isInstalled && (
                  <button
                    className="phantom-ui-provider-button phantom-ui-provider-button-mobile"
                    onClick={connectWithDeeplink}
                    disabled={connectionState.isConnecting}
                  >
                    {connectionState.isConnecting && connectionState.providerType === "deeplink"
                      ? "Opening Phantom..."
                      : "Open in Phantom App"}
                  </button>
                )}

                {/* Primary auth options - Phantom, Google */}
                {!isMobile && (
                  <>
                    {/* Login with Phantom (embedded provider using Phantom extension) */}
                    {isPhantomLoginAvailable.isAvailable && (
                      <button
                        className="phantom-ui-provider-button phantom-ui-provider-button-primary"
                        onClick={() => connectWithAuthProvider("phantom")}
                        disabled={connectionState.isConnecting}
                      >
                        {connectionState.isConnecting && connectionState.providerType === "embedded"
                          ? "Connecting..."
                          : "Login with Phantom"}
                      </button>
                    )}

                    {/* Continue with Google */}
                    <button
                      className="phantom-ui-provider-button"
                      onClick={() => connectWithAuthProvider("google")}
                      disabled={connectionState.isConnecting}
                    >
                      {connectionState.isConnecting && connectionState.providerType === "embedded"
                        ? "Connecting..."
                        : "Continue with Google"}
                    </button>
                  </>
                )}

                {/* Extension option - smaller UI section */}
                {!isMobile && isExtensionInstalled.isInstalled && (
                  <div className="phantom-ui-extension-section">
                    <div className="phantom-ui-divider">
                      <span>or</span>
                    </div>
                    <button
                      className="phantom-ui-provider-button phantom-ui-provider-button-secondary"
                      onClick={connectWithInjected}
                      disabled={connectionState.isConnecting}
                    >
                      {connectionState.isConnecting && connectionState.providerType === "injected"
                        ? "Connecting..."
                        : "Continue with extension"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PhantomUIContext.Provider>
  );
}

// Main exported Provider that wraps both react-sdk and react-ui providers
export function PhantomProvider({ children, theme = "light", customTheme, config }: PhantomUIProviderProps) {
  return (
    <BasePhantomProvider config={config}>
      <PhantomUIProvider theme={theme} customTheme={customTheme}>
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
