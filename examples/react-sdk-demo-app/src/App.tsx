import { Routes, Route } from "react-router-dom";
import {
  AddressType,
  PhantomProvider,
  type PhantomSDKConfig,
  type PhantomDebugConfig,
  DebugLevel,
  type DebugMessage,
  darkTheme,
} from "@phantom/react-sdk";
import { Actions } from "./Actions";
import { AuthCallback } from "./AuthCallback";
import { useState, useCallback, useMemo } from "react";
import { DebugContext, type DebugContextType } from "./contexts/DebugContext";

function App() {
  // Global debug state
  const [debugMessages, setDebugMessages] = useState<DebugMessage[]>([]);
  const [debugLevel, setDebugLevel] = useState<DebugLevel>(DebugLevel.DEBUG);
  const [showDebug, setShowDebug] = useState(true);

  // Debug callback function for the provider
  const handleDebugMessage = useCallback((message: DebugMessage) => {
    setDebugMessages(prev => {
      const newMessages = [...prev, message];
      // Keep only last 100 messages to prevent memory issues
      return newMessages.slice(-100);
    });
  }, []);

  const clearDebugMessages = useCallback(() => {
    setDebugMessages([]);
  }, []);

  // SDK configuration - embedded provider with autoConnect
  const config: PhantomSDKConfig = useMemo(
    () => ({
      providers: ["google", "apple", "phantom", "injected"],
      addressTypes: [AddressType.solana, AddressType.ethereum, AddressType.bitcoinSegwit, AddressType.sui],
      appId: import.meta.env.VITE_APP_ID || "your-app-id",
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://api.phantom.app/v1/wallets",
      embeddedWalletType: "user-wallet",
      authOptions: {
        authUrl: import.meta.env.VITE_AUTH_URL || "https://connect.phantom.app/login",
        redirectUrl: import.meta.env.VITE_REDIRECT_URL,
      },
      autoConnect: true,
    }),
    [],
  );

  // Debug configuration - separate to avoid SDK reinstantiation
  const debugConfig: PhantomDebugConfig = useMemo(
    () => ({
      enabled: true,
      level: debugLevel,
      callback: handleDebugMessage,
    }),
    [debugLevel, handleDebugMessage],
  );

  const debugContextValue: DebugContextType = useMemo(
    () => ({
      debugMessages,
      debugLevel,
      showDebug,
      setDebugLevel,
      setShowDebug,
      clearDebugMessages,
    }),
    [debugMessages, debugLevel, showDebug, setDebugLevel, setShowDebug, clearDebugMessages],
  );

  return (
    <DebugContext.Provider value={debugContextValue}>
      <Routes>
        <Route
          path="/auth/callback"
          element={
            <PhantomProvider
              config={config}
              debugConfig={debugConfig}
              theme={darkTheme}
              appIcon="https://picsum.photos/200"
              appName="Phantom React SDK Demo"
            >
              <AuthCallback />
            </PhantomProvider>
          }
        />
        <Route
          path="/"
          element={
            <PhantomProvider
              config={config}
              debugConfig={debugConfig}
              theme={darkTheme}
              appIcon="https://picsum.photos/200"
              appName="Phantom React SDK Demo"
            >
              <Actions />
            </PhantomProvider>
          }
        />
      </Routes>
    </DebugContext.Provider>
  );
}

export default App;
