import { Routes, Route } from "react-router-dom";
import {
  AddressType,
  PhantomProvider,
  type PhantomSDKConfig,
  type PhantomDebugConfig,
  DebugLevel,
  type DebugMessage,
  type ProviderType,
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

  // Provider type state - this will control the SDK configuration
  const [providerType, setProviderType] = useState<ProviderType>("embedded");
  const [embeddedWalletType, setEmbeddedWalletType] = useState<"user-wallet" | "app-wallet">("user-wallet");

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

  // SDK configuration - now dynamic based on provider type selection
  const config: PhantomSDKConfig = useMemo(
    () => ({
      appName: "React SDK Demo App",
      appLogo: "https://picsum.photos/200", // Optional app logo URL
      providerType: providerType, // Dynamic provider type
      addressTypes: [AddressType.solana, AddressType.ethereum, AddressType.bitcoinSegwit, AddressType.sui],

      // Solana library choice - matches browser-sdk demo
      solanaProvider: "web3js", // Using @solana/web3.js

      // Embedded wallet configuration (only used when providerType is "embedded")
      ...(providerType === "embedded" && {
        organizationId: import.meta.env.VITE_ORGANIZATION_ID || "your-organization-id",
        appId: import.meta.env.VITE_APP_ID || "your-app-id",
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://api.phantom.app/v1/wallets",
        embeddedWalletType: embeddedWalletType,
        authOptions: {
          authUrl: import.meta.env.VITE_AUTH_URL || "https://connect.phantom.app",
          redirectUrl: import.meta.env.VITE_REDIRECT_URL,
        },
        autoConnect: true, // Automatically connect to existing session
      }),
    }),
    [providerType, embeddedWalletType],
  ); // Dependencies - will cause SDK reinstantiation when changed

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
      <PhantomProvider config={config} debugConfig={debugConfig}>
        <Routes>
          <Route
            path="/"
            element={
              <Actions
                providerType={providerType}
                setProviderType={setProviderType}
                embeddedWalletType={embeddedWalletType}
                setEmbeddedWalletType={setEmbeddedWalletType}
              />
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </PhantomProvider>
    </DebugContext.Provider>
  );
}

export default App;
