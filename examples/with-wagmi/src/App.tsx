import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./wagmi";
import WalletDemo from "./WalletDemo";

// Create a query client for wagmi
const queryClient = new QueryClient();

function App() {
  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <div className="container">
            <h1>Phantom SDK + wagmi Integration</h1>
            <p>
              This example demonstrates how to use the Phantom SDK's Ethereum provider with wagmi to interact with
              Ethereum networks through standard Web3 tooling.
            </p>
            <WalletDemo />
          </div>
        </WagmiProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
