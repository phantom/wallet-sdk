import { PhantomSDKWalletAdapter } from "@phantom/sdk-wallet-adapter";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMemo } from "react";
import { WalletActions } from "./components/WalletActions";
import { WalletInfo } from "./components/WalletInfo";

// Import wallet adapter default styles
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletModalProvider } from "./components/WalletModalProvider";

function App() {
  // Configure wallets
  const wallets = useMemo(
    () => [
      new PhantomSDKWalletAdapter({
        appId: "11111111-1111-1111-1111-11111111",
        redirectUrl: "http://localhost:5174",
      }),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={"https://solana-mainnet.g.alchemy.com/v2/Pnb7lrjdZw6df2yXSKDiG"}>
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
