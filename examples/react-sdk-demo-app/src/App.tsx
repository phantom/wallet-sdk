import { Routes, Route } from "react-router-dom";
import { AddressType, PhantomProvider, type PhantomSDKConfig, DebugLevel } from "@phantom/react-sdk";
import { Actions } from "./Actions";
import { AuthCallback } from "./AuthCallback";

// Configuration supporting both embedded and injected providers
const config: PhantomSDKConfig = {
  appName: "React SDK Demo App",
  appLogo: "https://picsum.photos/200", // Optional app logo URL
  providerType: "embedded", // Default to embedded
  addressTypes: [AddressType.solana, AddressType.ethereum, AddressType.bitcoinSegwit, AddressType.sui],

  // Solana library choice - matches browser-sdk demo  
  solanaProvider: "web3js", // Using @solana/web3.js

  // Embedded wallet configuration (only used when providerType is "embedded")
  organizationId: import.meta.env.VITE_ORGANIZATION_ID || "your-organization-id",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://api.phantom.app/v1/wallets",
  embeddedWalletType: "user-wallet",
  authOptions: {
    authUrl: import.meta.env.VITE_AUTH_URL || "https://connect.phantom.app",
    redirectUrl: import.meta.env.VITE_REDIRECT_URL,
  },
  autoConnect: true, // Automatically connect to existing session

  // Enable debug by default
  debug: {
    enabled: true,
    level: DebugLevel.DEBUG,
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
