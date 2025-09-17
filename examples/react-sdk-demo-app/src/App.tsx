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
import { ConfigurationForm } from "./ConfigurationForm";
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

  // SDK instantiation state
  const [sdkInstantiated, setSdkInstantiated] = useState(false);

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
  const config: PhantomSDKConfig = useMemo(() => {
    const addressTypes = [AddressType.solana, AddressType.ethereum, AddressType.bitcoinSegwit, AddressType.sui];

    if (providerType === "embedded") {
      return {
        providerType,
        addressTypes,
        appId: import.meta.env.VITE_APP_ID || "your-app-id",
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://api.phantom.app/v1/wallets",
        embeddedWalletType: embeddedWalletType,
        authOptions: {
          authUrl: import.meta.env.VITE_AUTH_URL || "https://connect.phantom.app/login",
          redirectUrl: import.meta.env.VITE_REDIRECT_URL,
        },
        autoConnect: true,
      };
    } else {
      return {
        providerType,
        addressTypes,
      };
    }
  }, [providerType, embeddedWalletType]); // Dependencies - will cause SDK reinstantiation when changed

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

  // Auth callback always needs embedded config
  const authConfig: PhantomSDKConfig = useMemo(
    () => ({
      providerType: "embedded",
      addressTypes: [AddressType.solana, AddressType.ethereum, AddressType.bitcoinSegwit, AddressType.sui],
      appId: import.meta.env.VITE_APP_ID || "your-app-id",
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://api.phantom.app/v1/wallets",
      embeddedWalletType: "user-wallet", // Auth callback is always for user wallet
      authOptions: {
        authUrl: import.meta.env.VITE_AUTH_URL || "https://connect.phantom.app",
        redirectUrl: import.meta.env.VITE_REDIRECT_URL,
      },
      autoConnect: true,
    }),
    [],
  );

  return (
    <DebugContext.Provider value={debugContextValue}>
      <Routes>
        <Route
          path="/auth/callback"
          element={
            <PhantomProvider config={authConfig} debugConfig={debugConfig}>
              <AuthCallback />
            </PhantomProvider>
          }
        />
        <Route
          path="/"
          element={
            sdkInstantiated ? (
              <PhantomProvider config={config} debugConfig={debugConfig}>
                <Actions providerType={providerType} />
              </PhantomProvider>
            ) : (
              <ConfigurationForm
                providerType={providerType}
                setProviderType={setProviderType}
                embeddedWalletType={embeddedWalletType}
                setEmbeddedWalletType={setEmbeddedWalletType}
                onCreateSDK={() => setSdkInstantiated(true)}
              />
            )
          }
        />
      </Routes>
    </DebugContext.Provider>
  );
}

export default App;
