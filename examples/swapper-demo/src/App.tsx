import { Routes, Route } from "react-router-dom";
import { PhantomProvider, type PhantomSDKConfig, AddressType } from "@phantom/react-ui";
import SwapperExample from "./SwapperExample";
import { AuthCallback } from "./AuthCallback";

const config: PhantomSDKConfig = {
  providerType: "embedded" as const,
  addressTypes: [AddressType.solana] as const,
  appId: import.meta.env.VITE_APP_ID || "efe1febf-3af4-450f-bba8-b6f9ecb0f954",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://staging-api.phantom.app/v1/wallets",
  embeddedWalletType: "user-wallet",
  authOptions: {
    authUrl: import.meta.env.VITE_AUTH_URL || "http://localhost:3000/login",
    redirectUrl: import.meta.env.VITE_REDIRECT_URL || window.location.origin + "/auth/callback",
  },
};

function App() {
  return (
    <Routes>
      <Route
        path="/auth/callback"
        element={
          <PhantomProvider theme="light" config={config}>
            <AuthCallback />
          </PhantomProvider>
        }
      />
      <Route
        path="/"
        element={
          <PhantomProvider theme="light" config={config}>
            <div style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem',
              maxWidth: '600px',
              margin: '0 auto',
              padding: '2rem',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              <div style={{
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <h1 style={{
                  fontSize: '2.5rem',
                  background: 'linear-gradient(135deg, #ab9ff2 0%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '0.5rem',
                  fontWeight: 700
                }}>
                  Token Swapper
                </h1>
                <p style={{
                  color: '#6b7280',
                  fontSize: '1.1rem',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  Swap tokens on Solana
                </p>
              </div>

              <SwapperExample />
            </div>
          </PhantomProvider>
        }
      />
    </Routes>
  );
}

export default App;
