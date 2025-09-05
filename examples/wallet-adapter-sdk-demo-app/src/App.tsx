import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomSDKWalletAdapter } from "@phantom/sdk-wallet-adapter";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletInfo } from "./components/WalletInfo";
import { WalletActions } from "./components/WalletActions";

// Import wallet adapter default styles
import "@solana/wallet-adapter-react-ui/styles.css";

function App() {
  // Configure network
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Configure wallets
  const wallets = useMemo(
    () => [
      new PhantomSDKWalletAdapter({
        appId: "11111111-1111-1111-1111-11111111",
        embeddedWalletType: "user-wallet",
        apiBaseUrl: "https://staging-api.phantom.app/v1/wallets",
        authOptions: {
          authUrl: "https://staging-connect.phantom.app/login",
        },
      }),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app">
            <header className="header">
              <h1>🔮 Phantom SDK Wallet Adapter Demo</h1>
              <p>Connect your wallet and interact with Solana</p>
            </header>

            <div className="main-container">
              {/* Wallet Connect Button */}
              <section className="section">
                <h2>Connect Wallet</h2>
                <div className="wallet-button-container">
                  <WalletMultiButton />
                </div>
              </section>

              {/* Wallet Info Section */}
              <WalletInfo />

              {/* Wallet Actions Section */}
              <WalletActions />
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
