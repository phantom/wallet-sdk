import { AddressType, PhantomProvider, type PhantomSDKConfig } from "@phantom/react-sdk";
import { Actions } from "./Actions";

// Configuration supporting both embedded and injected providers
const config: PhantomSDKConfig = {
  appName: import.meta.env.VITE_APP_NAME || "React SDK Demo App",
  providerType: (import.meta.env.VITE_PROVIDER_TYPE as "injected" | "embedded") || "injected",
  addressTypes: [AddressType.solana, AddressType.ethereum, AddressType.bitcoinSegwit, AddressType.sui],

  // Embedded wallet configuration (only used when providerType is "embedded")
  ...(import.meta.env.VITE_ORGANIZATION_ID && {
    organizationId: import.meta.env.VITE_ORGANIZATION_ID,
  }),
  ...(import.meta.env.VITE_API_BASE_URL && {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  }),
  ...(import.meta.env.VITE_EMBEDDED_WALLET_TYPE && {
    embeddedWalletType: import.meta.env.VITE_EMBEDDED_WALLET_TYPE as "app-wallet" | "user-wallet",
  }),
};

function App() {
  return (
    <PhantomProvider config={config}>
      <Actions />
    </PhantomProvider>
  );
}

export default App;
