import "./Actions.css";
import {
  useConnect,
  useDisconnect,
  useSignAndSendTransaction,
  useSignMessage,
  useAccounts,
  usePhantom,
  useCreateUserOrganization,
  NetworkId,
  type ProviderType,
} from "@phantom/react-sdk";
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";
import { useState, useEffect } from "react";

export function Actions() {
  const { connect, isConnecting, error: connectError } = useConnect();
  const { disconnect, isDisconnecting } = useDisconnect();
  const { signAndSendTransaction, isSigning: isSigningTransaction } = useSignAndSendTransaction();
  const { signMessage, isSigning: isSigningMessage } = useSignMessage();
  const { createUserOrganization, isCreating } = useCreateUserOrganization();
  const { isConnected, isReady, currentProviderType } = usePhantom();
  const addresses = useAccounts();

  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>("injected");
  const [selectedEmbeddedType, setSelectedEmbeddedType] = useState<"user-wallet" | "app-wallet">("user-wallet");

  // Extract Solana address when addresses change
  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const solAddr = addresses.find(addr => addr.addressType === "Solana");
      setSolanaAddress(solAddr?.address || null);
    } else {
      setSolanaAddress(null);
    }
  }, [addresses]);

  const onConnect = async () => {
    try {
      const options = {
        providerType: selectedProvider,
        ...(selectedProvider === "embedded" && { embeddedWalletType: selectedEmbeddedType }),
      };
      await connect(options);
      // Connection state will be updated in the provider
    } catch (error) {
      console.error("Error connecting to Phantom:", error);
      alert(`Error connecting: ${(error as Error).message || error}`);
    }
  };

  const onDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Error disconnecting:", error);
      alert(`Error disconnecting: ${(error as Error).message || error}`);
    }
  };

  const onSignMessage = async () => {
    if (!isConnected || !solanaAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const signature = await signMessage("Hello from Phantom React SDK Demo!", NetworkId.SOLANA_MAINNET);
      alert(`Message Signed! Signature: ${signature}`);
    } catch (error) {
      console.error("Error signing message:", error);
      alert(`Error signing message: ${(error as Error).message || error}`);
    }
  };

  const onSignAndSendTransaction = async () => {
    if (!isConnected || !solanaAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const rpc = createSolanaRpc("https://solana-mainnet.g.alchemy.com/v2/Pnb7lrjdZw6df2yXSKDiG");

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(address(solanaAddress), tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      );

      const transaction = compileTransaction(transactionMessage);

      const result = await signAndSendTransaction({
        transaction: transaction,
        networkId: NetworkId.SOLANA_MAINNET,
      });

      alert(`Transaction sent! Signature: ${result.rawTransaction}`);
    } catch (error) {
      console.error("Error signing and sending transaction:", error);
      alert(`Error signing and sending transaction: ${(error as Error).message || error}`);
    }
  };

  const onCreateUserOrganization = async () => {
    try {
      const result = await createUserOrganization({
        userId: "demo-user-123",
      });
      alert(`Organization created! ID: ${result.organizationId}`);
    } catch (error) {
      console.error("Error creating organization:", error);
      alert(`Error creating organization: ${(error as Error).message || error}`);
    }
  };

  if (!isReady) {
    return <div>Loading...</div>;
  }

  return (
    <div id="app">
      <h1>Phantom React SDK Demo</h1>
      <div className="account-info">
        <p>
          <strong>Connection Status:</strong> {isConnected ? "Connected" : "Not Connected"}
        </p>
        {isConnected && currentProviderType && (
          <p>
            <strong>Current Provider:</strong> {currentProviderType}
          </p>
        )}
        {solanaAddress && (
          <p>
            <strong>Solana Address:</strong> {solanaAddress}
          </p>
        )}
        {addresses && addresses.length > 0 && (
          <div>
            <p>
              <strong>All Addresses:</strong>
            </p>
            <ul>
              {addresses.map((addr, index) => (
                <li key={index}>
                  <strong>{addr.addressType}:</strong> {addr.address}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!isConnected && (
        <div className="provider-selection">
          <h2>Provider Selection</h2>
          <div className="controls">
            <label>
              <input
                type="radio"
                value="injected"
                checked={selectedProvider === "injected"}
                onChange={e => setSelectedProvider(e.target.value as ProviderType)}
              />
              Injected Provider (Phantom Extension)
            </label>
            <label>
              <input
                type="radio"
                value="embedded"
                checked={selectedProvider === "embedded"}
                onChange={e => setSelectedProvider(e.target.value as ProviderType)}
              />
              Embedded Provider (Server-based)
            </label>
          </div>

          {selectedProvider === "embedded" && (
            <div className="embedded-options">
              <h3>Embedded Wallet Type</h3>
              <div className="controls">
                <label>
                  <input
                    type="radio"
                    value="user-wallet"
                    checked={selectedEmbeddedType === "user-wallet"}
                    onChange={() => setSelectedEmbeddedType("user-wallet")}
                  />
                  User Wallet (Google Auth)
                </label>
                <label>
                  <input
                    type="radio"
                    value="app-wallet"
                    checked={selectedEmbeddedType === "app-wallet"}
                    onChange={() => setSelectedEmbeddedType("app-wallet")}
                  />
                  App Wallet (Fresh wallet)
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="plugin-section">
        <h2>Wallet Actions</h2>
        <div className="controls">
          <button id="connectBtn" onClick={onConnect} disabled={isConnected || isConnecting}>
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
          <button id="signMessageBtn" onClick={onSignMessage} disabled={!isConnected || isSigningMessage}>
            {isSigningMessage ? "Signing..." : "Sign Message"}
          </button>
          <button
            id="signAndSendTransactionBtn"
            onClick={onSignAndSendTransaction}
            disabled={!isConnected || isSigningTransaction}
          >
            {isSigningTransaction ? "Signing..." : "Sign and Send Transaction"}
          </button>
          <button id="disconnectBtn" onClick={onDisconnect} disabled={!isConnected || isDisconnecting}>
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
          <button id="createOrgBtn" onClick={onCreateUserOrganization} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create User Organization"}
          </button>
        </div>
        {connectError && <p style={{ color: "red" }}>Connection Error: {connectError.message}</p>}
      </div>

      <div className="info-section">
        <h3>About Dual Provider Support:</h3>
        <p>
          <strong>Injected Provider:</strong> Uses the Phantom browser extension. Make sure you have the Phantom wallet
          extension installed.
        </p>
        <p>
          <strong>Embedded Provider:</strong> Server-based wallet management with Google authentication or fresh wallet
          creation.
        </p>
        <p>Both providers support Solana transactions and message signing.</p>
        <p>Organization creation requires a backend server at http://localhost:3000/api</p>
        <p>The SDK automatically persists your provider choice across sessions.</p>
      </div>
    </div>
  );
}
