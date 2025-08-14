import { Routes, Route } from "react-router-dom";
import { AddressType, PhantomProvider, type PhantomSDKConfig, DebugLevel } from "@phantom/react-sdk";
import { Actions } from "./Actions";
import { AuthCallback } from "./AuthCallback";

// Configuration supporting both embedded and injected providers
const config: PhantomSDKConfig = {
  appName: "React SDK Demo App",
  appLogo: "https://picsum.photos/200", // Optional app logo URL
  providerType: "injected", // Default to embedded
  addressTypes: [AddressType.solana, AddressType.ethereum, AddressType.bitcoinSegwit, AddressType.sui],

  // Solana library choice - matches browser-sdk demo
  solanaProvider: "kit", // Using @solana/kit for better performance

  // Embedded wallet configuration (only used when providerType is "embedded")
  organizationId: import.meta.env.VITE_ORGANIZATION_ID || "your-organization-id",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://api.phantom.app/v1/wallets",
  embeddedWalletType: "user-wallet",
  authOptions: {
    authUrl: import.meta.env.VITE_AUTH_URL || "https://connect.phantom.app",
    redirectUrl: import.meta.env.VITE_REDIRECT_URL,
  },

  // Enable debug by default
  debug: {
    enabled: true,
    level: DebugLevel.INFO,
  },
};

function App() {
  return (
    <PhantomProvider config={config}>
      <Routes>
        <Route path="/" element={<Actions />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </PhantomProvider>
  );
}

export default App;
