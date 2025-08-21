import "./Actions.css";
import {
  useConnect,
  useDisconnect,
  useSignAndSendTransaction,
  useSignMessage,
  useAccounts,
  usePhantom,
  useIsExtensionInstalled,
  NetworkId,
  type ProviderType,
} from "@phantom/react-sdk";
import { SystemProgram, PublicKey, Connection, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { useState, useEffect } from "react";
import { useBalance } from "./hooks/useBalance";
import { DebugConsole } from "./components/DebugConsole";

export function Actions() {
  const { connect, isConnecting, error: connectError } = useConnect();
  const { disconnect, isDisconnecting } = useDisconnect();
  const { signAndSendTransaction, isSigning: isSigningTransaction } = useSignAndSendTransaction();
  const { signMessage, isSigning: isSigningMessage } = useSignMessage();
  const { isConnected, currentProviderType } = usePhantom();
  const { isInstalled, isLoading } = useIsExtensionInstalled();
  const addresses = useAccounts();

  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>("embedded");
  const [selectedEmbeddedType, setSelectedEmbeddedType] = useState<"user-wallet" | "app-wallet">("user-wallet");

  // Use balance hook
  const { balance, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useBalance(solanaAddress);
  const hasBalance = balance !== null && balance > 0;


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

  const onSignMessage = async (type: "solana" | "evm") => {
    if (!isConnected || !solanaAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const result = await signMessage({
        message: "Hello, World!",
        networkId: type === "solana" ? NetworkId.SOLANA_MAINNET : NetworkId.ETHEREUM_MAINNET,
      });
      alert(
        `Message Signed! Signature: ${result.signature}${result.blockExplorer ? `\n\nView on explorer: ${result.blockExplorer}` : ""}`,
      );
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
      // Create connection to get recent blockhash (using environment RPC URL)
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create a versioned transaction message
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress),
        toPubkey: new PublicKey(solanaAddress), // Self-transfer for demo
        lamports: 1000, // Very small amount: 0.000001 SOL
      });

      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(solanaAddress),
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

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

  return (
    <div id="app">
      <h1>Phantom React SDK Demo</h1>

      <div className="main-layout">
        <div className="left-panel">
          <div className="section">
            <h3>Provider Configuration</h3>
            <div className="form-group">
              <label>Provider Type:</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="embedded"
                    checked={selectedProvider === "embedded"}
                    onChange={e => setSelectedProvider(e.target.value as ProviderType)}
                  />
                  <span>Embedded (Non-Custodial)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="injected"
                    checked={selectedProvider === "injected"}
                    onChange={e => setSelectedProvider(e.target.value as ProviderType)}
                  />
                  <span>Injected (Browser Extension)</span>
                </label>
              </div>
            </div>

            {selectedProvider === "embedded" && (
              <div className="form-group">
                <label>Embedded Wallet Type:</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="user-wallet"
                      checked={selectedEmbeddedType === "user-wallet"}
                      onChange={() => setSelectedEmbeddedType("user-wallet")}
                    />
                    <span>User Wallet (Google Auth)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="app-wallet"
                      checked={selectedEmbeddedType === "app-wallet"}
                      onChange={() => setSelectedEmbeddedType("app-wallet")}
                    />
                    <span>App Wallet (Fresh wallet)</span>
                  </label>
                </div>
              </div>
            )}

            {selectedProvider === "injected" && (
              <div className="extension-status">
                {isLoading && <p className="status-text">Checking extension...</p>}
                {!isLoading && isInstalled && <p className="status-success">✓ Phantom extension installed</p>}
                {!isLoading && !isInstalled && <p className="status-error">✗ Phantom extension not installed</p>}
              </div>
            )}
          </div>

          <div className="section">
            <h3>Connection Status</h3>
            <div className="status-card">
              <div className="status-row">
                <span className="status-label">Status:</span>
                <span className={`status-value ${isConnected ? "connected" : "disconnected"}`}>
                  {isConnected ? "Connected" : "Not Connected"}
                </span>
              </div>
              {isConnected && currentProviderType && (
                <div className="status-row">
                  <span className="status-label">Provider:</span>
                  <span className="status-value">{currentProviderType}</span>
                </div>
              )}
              {solanaAddress && (
                <div className="status-row">
                  <span className="status-label">Solana:</span>
                  <span className="status-value address">{solanaAddress}</span>
                </div>
              )}
              {addresses && addresses.length > 1 && (
                <div className="status-row">
                  <span className="status-label">Total:</span>
                  <span className="status-value">{addresses.length} addresses</span>
                </div>
              )}
            </div>
          </div>

          {isConnected && solanaAddress && (
            <div className="section">
              <h3>SOL Balance</h3>
              <div className="balance-card">
                <div className="balance-row">
                  <span className="balance-label">Balance:</span>
                  <span className="balance-value">
                    {balanceLoading
                      ? "Loading..."
                      : balanceError
                        ? "Error"
                        : balance !== null
                          ? `${balance.toFixed(4)} SOL`
                          : "--"}
                  </span>
                </div>
                <button className="small" onClick={() => refetchBalance()} disabled={balanceLoading}>
                  {balanceLoading ? "Loading..." : "Refresh"}
                </button>
              </div>
              {balanceError && <p className="error-text">Balance error: {balanceError}</p>}
            </div>
          )}

          <div className="section">
            <h3>Wallet Operations</h3>
            <div className="button-group">
              <button
                className={`${!isConnected ? "primary" : ""}`}
                onClick={onConnect}
                disabled={isConnected || isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </button>
              <button onClick={() => onSignMessage("solana")} disabled={!isConnected || isSigningMessage}>
                {isSigningMessage ? "Signing..." : "Sign Message"}
              </button>
              <button onClick={() => onSignMessage("evm")} disabled={!isConnected || isSigningMessage}>
                {isSigningMessage ? "Signing..." : "Sign Message EVM"}
              </button>
              <button onClick={onSignAndSendTransaction} disabled={!isConnected || isSigningTransaction || !hasBalance}>
                {isSigningTransaction ? "Signing..." : !hasBalance ? "Insufficient Balance" : "Sign & Send Transaction"}
              </button>

              <button onClick={onDisconnect} disabled={!isConnected || isDisconnecting}>
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
            {connectError && <p className="error-text">Error: {connectError.message}</p>}
          </div>
        </div>

        <div className="right-panel">
          <DebugConsole />
        </div>
      </div>
    </div>
  );
}
