import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useConnect as useBaseConnect, usePhantom } from "@phantom/react-sdk";

export interface PhantomUIProviderProps {
  children: ReactNode;
  theme?: "light" | "dark" | "auto";
  customTheme?: Record<string, string>;
}

// Connection UI state
interface ConnectionUIState {
  isVisible: boolean;
  isConnecting: boolean;
  error: Error | null;
  providerType: "injected" | "embedded" | null;
}

interface PhantomUIContextValue {
  // Connection state
  connectionState: ConnectionUIState;
  showConnectionModal: () => void;
  hideConnectionModal: () => void;
  connectWithAuthProvider: (provider?: "google" | "apple") => Promise<void>;
}

const PhantomUIContext = createContext<PhantomUIContextValue | null>(null);

export function PhantomUIProvider({ children, theme = "light", customTheme }: PhantomUIProviderProps) {
  const baseConnect = useBaseConnect();
  const { isPhantomAvailable: _isPhantomAvailable } = usePhantom();

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
    async (provider?: "google" | "apple") => {
      try {
        setConnectionState(prev => ({
          ...prev,
          isConnecting: true,
          error: null,
          providerType: "embedded", // Always embedded when using modal
        }));

        const authOptions = provider ? { provider } : undefined;
        await baseConnect.connect(authOptions);

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

  const contextValue: PhantomUIContextValue = {
    connectionState,
    showConnectionModal,
    hideConnectionModal,
    connectWithAuthProvider,
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
                <button
                  className="phantom-ui-provider-button"
                  onClick={() => connectWithAuthProvider("google")}
                  disabled={connectionState.isConnecting}
                >
                  {connectionState.isConnecting ? "Connecting..." : "Continue with Google"}
                </button>

                <button
                  className="phantom-ui-provider-button phantom-ui-provider-button-secondary"
                  onClick={() => connectWithAuthProvider()}
                  disabled={connectionState.isConnecting}
                >
                  {connectionState.isConnecting ? "Connecting..." : "Create Fresh Wallet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PhantomUIContext.Provider>
  );
}

export function usePhantomUI(): PhantomUIContextValue {
  const context = useContext(PhantomUIContext);
  if (!context) {
    throw new Error("usePhantomUI must be used within a PhantomUIProvider");
  }
  return context;
}
