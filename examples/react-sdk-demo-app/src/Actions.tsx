import "./Actions.css";
import {
  useConnect,
  useDisconnect,
  useSolana,
  useEthereum,
  useAccounts,
  usePhantom,
  useIsExtensionInstalled,
  DebugLevel,
  debug,
  type ProviderType,
  type DebugMessage,
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
import { useState, useEffect, useCallback } from "react";
import { useBalance } from "./hooks/useBalance";

export function Actions() {
  const { connect, isConnecting, error: connectError } = useConnect();
  const { disconnect, isDisconnecting } = useDisconnect();
  const { signMessage: signSolanaMessage, signAndSendTransaction } = useSolana();
  const { signPersonalMessage: signEthMessage } = useEthereum();
  const { isConnected, currentProviderType } = usePhantom();
  const { isInstalled, isLoading } = useIsExtensionInstalled();
  const addresses = useAccounts();
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [isSigningTransaction, setIsSigningTransaction] = useState(false);

  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>("embedded");
  const [selectedEmbeddedType, setSelectedEmbeddedType] = useState<"user-wallet" | "app-wallet">("user-wallet");

  // Use balance hook
  const { balance, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useBalance(solanaAddress);
  const hasBalance = balance !== null && balance > 0;

  // Debug state
  const [debugLevel, setDebugLevel] = useState<DebugLevel>(DebugLevel.INFO);
  const [showDebug, setShowDebug] = useState(true);
  const [debugMessages, setDebugMessages] = useState<DebugMessage[]>([]);
  // Debug callback function
  const handleDebugMessage = useCallback((message: DebugMessage) => {
    setDebugMessages(prev => {
      const newMessages = [...prev, message];
      // Keep only last 100 messages to prevent memory issues
      return newMessages.slice(-100);
    });
  }, []);

  // Initialize debug system
  useEffect(() => {
    debug.setCallback(handleDebugMessage);
    debug.setLevel(debugLevel);
    debug.enable();
  }, [handleDebugMessage, debugLevel]);

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
      // Note: Provider type and embedded wallet type are configured at SDK initialization level
      // not at connect level in the new architecture
      await connect();
      // Connection state will be updated in the provider
    } catch (error) {
      console.error("Error connecting to Phantom:", error);
      alert(`Error connecting: ${(error as Error).message || error}`);
    }
  };

  const clearDebugMessages = () => {
    setDebugMessages([]);
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
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningMessage(true);
      if (type === "solana") {
        const result = await signSolanaMessage("Hello, World!");
        alert(`Message Signed! Signature: ${result.signature}`);
      } else {
        const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
        if (!ethAddress) {
          alert("No Ethereum address found");
          return;
        }
        const result = await signEthMessage("Hello, World!", ethAddress.address);
        alert(`Message Signed! Signature: ${result}`);
      }
    } catch (error) {
      console.error("Error signing message:", error);
      alert(`Error signing message: ${(error as Error).message || error}`);
    } finally {
      setIsSigningMessage(false);
    }
  };

  const onSignAndSendTransaction = async () => {
    if (!isConnected || !solanaAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningTransaction(true);
      const rpc = createSolanaRpc(import.meta.env.VITE_SOLANA_RPC_URL_MAINNET);

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(address(solanaAddress), tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      );

      const transaction = compileTransaction(transactionMessage);

      const result = await signAndSendTransaction(transaction);

      alert(`Transaction sent! Signature: ${result.signature}`);
    } catch (error) {
      console.error("Error signing and sending transaction:", error);
      alert(`Error signing and sending transaction: ${(error as Error).message || error}`);
    } finally {
      setIsSigningTransaction(false);
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
          <div className="section">
            <h3>Debug Console</h3>
            <div className="debug-controls">
              <label className="checkbox-label">
                <input type="checkbox" checked={showDebug} onChange={e => setShowDebug(e.target.checked)} />
                <span>Show Debug Messages</span>
              </label>

              <div className="form-group inline">
                <label>Level:</label>
                <select value={debugLevel} onChange={e => setDebugLevel(parseInt(e.target.value) as DebugLevel)}>
                  <option value={DebugLevel.ERROR}>ERROR</option>
                  <option value={DebugLevel.WARN}>WARN</option>
                  <option value={DebugLevel.INFO}>INFO</option>
                  <option value={DebugLevel.DEBUG}>DEBUG</option>
                </select>
              </div>

              <button className="small" onClick={clearDebugMessages}>
                Clear
              </button>
            </div>

            <div className="debug-container" style={{ display: showDebug ? "block" : "none" }}>
              {debugMessages.slice(-30).map((msg, index) => {
                const levelClass = DebugLevel[msg.level].toLowerCase();
                const timestamp = new Date(msg.timestamp).toLocaleTimeString();
                // Debug message rendering
                let dataStr = "";
                try {
                  dataStr = msg.data ? JSON.stringify(msg.data, null, 2) : "";
                } catch (error) {
                  console.error("Error stringifying debug message data:", error);
                }

                return (
                  <div key={index} className={`debug-message debug-${levelClass}`}>
                    <div className="debug-header">
                      <span className="debug-timestamp">{timestamp}</span>
                      <span className="debug-level">{DebugLevel[msg.level]}</span>
                      <span className="debug-category">{msg.category}</span>
                    </div>
                    <div className="debug-content">{msg.message}</div>
                    {dataStr && <pre className="debug-data">{dataStr}</pre>}
                  </div>
                );
              })}
              {debugMessages.length === 0 && (
                <div className="debug-empty">No debug messages yet. Try connecting to see debug output.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
