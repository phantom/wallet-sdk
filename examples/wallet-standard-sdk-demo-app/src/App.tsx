import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletInfo } from "./components/WalletInfo";
import { WalletActions } from "./components/WalletActions";
import { useInitWalletStandard } from "./hooks/useInitWalletStandard";

// Import wallet adapter default styles
import "@solana/wallet-adapter-react-ui/styles.css";

function App() {
  // Configure network
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  useInitWalletStandard();

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <div className="app">
            <header className="header">
              <h1>🔮 Phantom SDK Wallet Standard Demo</h1>
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
