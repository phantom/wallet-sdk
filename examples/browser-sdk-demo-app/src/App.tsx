import { useState, useCallback, useEffect } from "react";
import { BrowserSDK, AddressType, debug, DebugLevel, NetworkId } from "@phantom/browser-sdk";
import type { DebugMessage } from "@phantom/browser-sdk";
import { SystemProgram, PublicKey, Connection, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { parseEther, parseGwei, numberToHex } from "viem";
import { getBalance } from "./utils/balance";
import { Buffer } from "buffer";
import bs58 from "bs58";

type ProviderType = "injected" | "embedded";

interface WalletAddress {
  addressType: string;
  address: string;
}

function App() {
  const [sdk, setSdk] = useState<BrowserSDK | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [providerType, setProviderType] = useState<ProviderType>("embedded");
  const [debugMessages, setDebugMessages] = useState<DebugMessage[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const [debugLevel, setDebugLevel] = useState<DebugLevel>(DebugLevel.DEBUG);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug callback function
  const handleDebugMessage = useCallback((message: DebugMessage) => {
    setDebugMessages(prev => {
      const newMessages = [...prev, message];
      // Keep only last 100 messages to prevent memory issues
      return newMessages.slice(-100);
    });
  }, []);

  // Create SDK instance
  const createSDK = useCallback(
    (type: ProviderType): BrowserSDK => {
      // Set debug config
      debug.enable();
      debug.setLevel(debugLevel);
      debug.setCallback(handleDebugMessage);

      if (type === "injected") {
        return new BrowserSDK({
          providers: ["injected"],
          addressTypes: [AddressType.solana, AddressType.ethereum],
        });
      } else {
        const embeddedSdk = new BrowserSDK({
          providers: ["google", "apple", "phantom"],
          apiBaseUrl: import.meta.env.VITE_WALLET_API,
          appId: import.meta.env.VITE_APP_ID || "your-app-id",
          embeddedWalletType: "user-wallet",
          authOptions: {
            authUrl: import.meta.env.VITE_AUTH_URL,
          },
          addressTypes: [AddressType.solana, AddressType.ethereum],
        });

        embeddedSdk.on("connect_start", data => {
          console.log("Embedded SDK connect started:", data);
          setIsLoading(true);
        });

        embeddedSdk.on("connect", () => {
          console.log("Embedded SDK connected:", embeddedSdk.getAddresses());
          const newAddresses = embeddedSdk.getAddresses();
          setAddresses(newAddresses);
          setIsConnected(true);
          setIsLoading(false);
          updateBalance(newAddresses);
        });

        embeddedSdk.on("connect_error", data => {
          console.log("Embedded SDK connect error:", data);
          setError(data.error || "Connection failed");
          setIsLoading(false);
        });

        embeddedSdk.on("disconnect", () => {
          console.log("Embedded SDK disconnected");
          setAddresses([]);
          setBalance(null);
          setIsConnected(false);
          setIsLoading(false);
        });

        // Trigger autoConnect
        setTimeout(() => embeddedSdk.autoConnect(), 100);

        return embeddedSdk;
      }
    },
    [debugLevel, handleDebugMessage],
  );

  // Initialize SDK
  useEffect(() => {
    const newSdk = createSDK(providerType);
    setSdk(newSdk);

    return () => {
      // Cleanup on unmount
      if (newSdk && newSdk.isConnected()) {
        newSdk.disconnect().catch(console.error);
      }
    };
  }, [providerType, createSDK]);

  // Update balance
  const updateBalance = useCallback(
    async (addrs: WalletAddress[] = addresses) => {
      const solanaAddress = addrs.find(a => a.addressType === AddressType.solana);
      if (!solanaAddress) {
        setBalance(null);
        return;
      }

      try {
        const result = await getBalance(solanaAddress.address);
        if (result.error) {
          console.error("Balance error:", result.error);
          setBalance(null);
        } else {
          setBalance(result.balance || 0);
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance(null);
      }
    },
    [addresses],
  );

  // Connect handler
  const handleConnect = async () => {
    if (!sdk) return;

    setIsLoading(true);
    setError(null);

    try {
      // Determine provider based on current provider type
      const provider = providerType === "injected" ? "injected" : "phantom";
      const result = await sdk.connect({ provider });
      setAddresses(result.addresses);
      setIsConnected(true);
      await updateBalance(result.addresses);
      console.log("Connected successfully:", result);
    } catch (error) {
      console.error("Error connecting:", error);
      setError((error as Error).message || "Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Connect with Phantom handler
  const handleConnectWithPhantom = async () => {
    if (!sdk) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await sdk.connect({ provider: "phantom" });
      setAddresses(result.addresses);
      setIsConnected(true);
      await updateBalance(result.addresses);
      console.log("Connected successfully with Phantom:", result);
    } catch (error) {
      console.error("Error connecting with Phantom:", error);
      setError((error as Error).message || "Connection with Phantom failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Connect with Google handler
  const handleConnectWithGoogle = async () => {
    if (!sdk) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await sdk.connect({ provider: "google" });
      setAddresses(result.addresses);
      setIsConnected(true);
      await updateBalance(result.addresses);
      console.log("Connected successfully with Google:", result);
    } catch (error) {
      console.error("Error connecting with Google:", error);
      setError((error as Error).message || "Connection with Google failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    if (!sdk) return;

    try {
      await sdk.disconnect();
      setSdk(null);
      setAddresses([]);
      setBalance(null);
      setIsConnected(false);

      // Create new SDK instance
      const newSdk = createSDK(providerType);
      setSdk(newSdk);
    } catch (error) {
      console.error("Error disconnecting:", error);
      setError((error as Error).message || "Disconnect failed");
    }
  };

  // Get addresses handler
  const handleGetAddresses = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    try {
      const newAddresses = await sdk.getAddresses();
      setAddresses(newAddresses);
      await updateBalance(newAddresses);
    } catch (error) {
      console.error("Error getting addresses:", error);
      setError((error as Error).message || "Failed to get addresses");
    }
  };

  // Sign message handler
  const handleSignMessage = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    try {
      const message = "Hello from Phantom SDK!";
      const result = await sdk.solana.signMessage(message);
      console.log("Message signed:", result);
      alert(`Message signed: ${bs58.encode(result.signature)}`);
    } catch (error) {
      console.error("Error signing message:", error);
      setError((error as Error).message || "Failed to sign message");
    }
  };

  // Sign EVM message handler
  const handleSignEvmMessage = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    const ethAddress = addresses.find(a => a.addressType === AddressType.ethereum);
    if (!ethAddress) {
      setError("No Ethereum address found");
      return;
    }

    try {
      const message = "Hello from Phantom Browser SDK (EVM)!";
      const prefixedMessage = "0x" + Buffer.from(message, "utf8").toString("hex");
      const result = await sdk.ethereum.signPersonalMessage(prefixedMessage, ethAddress.address);
      console.log("EVM Message signed:", result);
      alert(`EVM Message signed: ${result}`);
    } catch (error) {
      console.error("Error signing EVM message:", error);
      setError((error as Error).message || "Failed to sign EVM message");
    }
  };

  // Sign transaction handler (Solana) - Sign only, don't send
  const handleSignSolanaTransaction = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    const solanaAddress = addresses.find(a => a.addressType === AddressType.solana);
    if (!solanaAddress) {
      setError("No Solana address found");
      return;
    }

    if (!balance || balance <= 0.001) {
      setError("Insufficient balance for transaction");
      return;
    }

    setIsLoading(true);
    try {
      // Create connection to get recent blockhash
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create a versioned transaction message
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress.address),
        toPubkey: new PublicKey(solanaAddress.address), // Self-transfer for demo
        lamports: 1000, // Very small amount: 0.000001 SOL
      });

      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(solanaAddress.address),
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      const result = await sdk.solana.signTransaction(transaction);

      console.log("Transaction signed:", result);
      alert(`Transaction signed: ${result}`);
    } catch (error) {
      console.error("Error signing transaction:", error);
      setError((error as Error).message || "Failed to sign transaction");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign and send transaction handler (Solana)
  const handleSignAndSendSolanaTransaction = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    const solanaAddress = addresses.find(a => a.addressType === AddressType.solana);
    if (!solanaAddress) {
      setError("No Solana address found");
      return;
    }

    if (!balance || balance <= 0.001) {
      setError("Insufficient balance for transaction");
      return;
    }

    setIsLoading(true);
    try {
      // Create connection to get recent blockhash
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create a versioned transaction message
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress.address),
        toPubkey: new PublicKey(solanaAddress.address), // Self-transfer for demo
        lamports: 1000, // Very small amount: 0.000001 SOL
      });

      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(solanaAddress.address),
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      const result = await sdk.solana.signAndSendTransaction(transaction);

      console.log("Transaction sent:", result);
      alert(`Transaction sent: ${result.signature}`);

      // Refresh balance after transaction
      await updateBalance();
    } catch (error) {
      console.error("Error signing and sending transaction:", error);
      setError((error as Error).message || "Failed to sign and send transaction");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Ethereum transaction (sign only, don't send)
  const handleSignEthTransaction = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    const ethAddress = addresses.find(a => a.addressType === AddressType.ethereum);
    if (!ethAddress) {
      setError("No Ethereum address found");
      return;
    }

    setIsLoading(true);
    try {
      // Create simple ETH transfer with proper hex formatting
      const transactionParams = {
        from: ethAddress.address,
        to: ethAddress.address, // Self-transfer for demo
        value: numberToHex(parseEther("0.001")), // 0.001 ETH in hex
        gas: numberToHex(21000n), // Gas limit in hex
        gasPrice: numberToHex(parseGwei("20")), // 20 gwei in hex
      };

      console.log("Signing Ethereum transaction with params:", transactionParams);
      const result = await sdk.ethereum.signTransaction(transactionParams);

      console.log("Ethereum transaction signed:", result);
      alert(`Ethereum transaction signed: ${result}`);
    } catch (error) {
      console.error("Error signing Ethereum transaction:", error);
      setError((error as Error).message || "Failed to sign Ethereum transaction");
    } finally {
      setIsLoading(false);
    }
  };

  // Test eth_signTransaction RPC method
  const handleEthSignTransactionRPC = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    const ethAddress = addresses.find(a => a.addressType === AddressType.ethereum);
    if (!ethAddress) {
      setError("No Ethereum address found");
      return;
    }

    setIsLoading(true);
    try {
      // Create simple ETH transfer with proper hex formatting
      const transactionParams = {
        from: ethAddress.address,
        to: ethAddress.address, // Self-transfer for demo
        value: numberToHex(parseEther("0.001")), // 0.001 ETH in hex
        gas: numberToHex(21000n), // Gas limit in hex
        gasPrice: numberToHex(parseGwei("20")), // 20 gwei in hex
      };

      console.log("Signing Ethereum transaction via RPC with params:", transactionParams);

      // Use the RPC method instead of direct signTransaction
      const result = await sdk.ethereum.request({
        method: "eth_signTransaction",
        params: [transactionParams],
      });

      console.log("Ethereum transaction signed via RPC:", result);
      alert(`Ethereum transaction signed via RPC: ${result}`);
    } catch (error) {
      console.error("Error signing Ethereum transaction via RPC:", error);
      setError((error as Error).message || "Failed to sign Ethereum transaction via RPC");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign typed data handler (EVM)
  const handleSignTypedData = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    const ethAddress = addresses.find(a => a.addressType === AddressType.ethereum);
    if (!ethAddress) {
      setError("No Ethereum address found");
      return;
    }

    try {
      // Example typed data structure (EIP-712)
      const typedData = {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
          ],
        },
        primaryType: "Mail",
        domain: {
          name: "Ether Mail",
          version: "1",
          chainId: 1,
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
        },
        message: {
          from: {
            name: "Cow",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          to: {
            name: "Bob",
            wallet: ethAddress.address,
          },
          contents: "Hello, Bob! This is a typed data message from Phantom Browser SDK.",
        },
      };

      const result = await sdk.ethereum.signTypedData(typedData, ethAddress.address);
      console.log("Typed data signed:", result);
      alert(`Typed data signed: ${result}`);
    } catch (error) {
      console.error("Error signing typed data:", error);
      setError((error as Error).message || "Failed to sign typed data");
    }
  };

  // Sign and send Ethereum transaction
  const handleSignAndSendEthTransaction = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    const ethAddress = addresses.find(a => a.addressType === AddressType.ethereum);
    if (!ethAddress) {
      setError("No Ethereum address found");
      return;
    }

    setIsLoading(true);
    try {
      // Create simple ETH transfer with proper hex formatting
      const transactionParams = {
        from: ethAddress.address,
        to: ethAddress.address, // Self-transfer for demo
        value: numberToHex(parseEther("0.001")), // 0.001 ETH in hex
        gas: numberToHex(21000n), // Gas limit in hex
        gasPrice: numberToHex(parseGwei("20")), // 20 gwei in hex
      };

      console.log("Sending Ethereum transaction with params:", transactionParams);
      const result = await sdk.ethereum.sendTransaction(transactionParams);

      console.log("Ethereum transaction sent:", result);
      alert(`Ethereum transaction sent: ${result}`);
    } catch (error) {
      console.error("Error with Ethereum transaction:", error);
      setError((error as Error).message || "Failed to send Ethereum transaction");
    } finally {
      setIsLoading(false);
    }
  };

  // Send 0.00001 ETH on Ethereum mainnet
  const handleSendEthMainnet = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    const ethAddress = addresses.find(a => a.addressType === AddressType.ethereum);
    if (!ethAddress) {
      setError("No Ethereum address found");
      return;
    }

    setIsLoading(true);
    try {
      // Create ETH transfer (0.00001 ETH to self)
      const transactionParams = {
        from: ethAddress.address,
        to: ethAddress.address, // Self-transfer
        value: numberToHex(parseEther("0.00001")), // 0.00001 ETH in hex
        chainId: numberToHex(1), // Ethereum mainnet
      };

      console.log("Sending 0.00001 ETH on Ethereum mainnet:", transactionParams);
      const result = await sdk.ethereum.sendTransaction(transactionParams);

      console.log("ETH transaction sent on mainnet:", result);
      alert(`ETH transaction sent on Ethereum mainnet! Hash: ${result}`);
    } catch (error) {
      console.error("Error sending ETH on mainnet:", error);
      setError((error as Error).message || "Failed to send ETH on mainnet");
    } finally {
      setIsLoading(false);
    }
  };

  // Send 0.00001 POL on Polygon mainnet
  const handleSendPolygon = async () => {
    if (!sdk || !sdk.isConnected()) {
      setError("Please connect first");
      return;
    }

    const ethAddress = addresses.find(a => a.addressType === AddressType.ethereum);
    if (!ethAddress) {
      setError("No Ethereum address found");
      return;
    }

    setIsLoading(true);
    try {
      // Create POL transfer (0.00001 POL to self) on Polygon mainnet
      const transactionParams = {
        from: ethAddress.address,
        to: ethAddress.address, // Self-transfer
        value: numberToHex(parseEther("0.00001")), // 0.00001 POL in hex
        chainId: numberToHex(137), // Polygon mainnet
      };

      console.log("Sending 0.00001 POL on Polygon mainnet:", transactionParams);
      const result = await sdk.ethereum.sendTransaction(transactionParams);

      console.log("POL transaction sent on Polygon:", result);
      alert(`POL transaction sent on Polygon mainnet! Hash: ${result}`);
    } catch (error) {
      console.error("Error sending POL on Polygon:", error);
      setError((error as Error).message || "Failed to send POL on Polygon");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-confirm handlers (only for injected provider)
  const handleEnableAutoConfirm = async () => {
    if (!sdk || !sdk.isConnected() || providerType !== "injected") {
      setError("Auto-confirm is only available for injected provider");
      return;
    }

    try {
      const result = await sdk.enableAutoConfirm({
        chains: [NetworkId.SOLANA_DEVNET, NetworkId.ETHEREUM_MAINNET],
      });
      console.log("Auto-confirm enabled:", result);
      alert(`Auto-confirm enabled: ${result.enabled}\nChains: ${result.chains.join(", ")}`);
    } catch (error) {
      console.error("Error enabling auto-confirm:", error);
      setError((error as Error).message || "Failed to enable auto-confirm");
    }
  };

  const handleDisableAutoConfirm = async () => {
    if (!sdk || !sdk.isConnected() || providerType !== "injected") {
      setError("Auto-confirm is only available for injected provider");
      return;
    }

    try {
      await sdk.disableAutoConfirm();
      console.log("Auto-confirm disabled successfully");
      alert("Auto-confirm disabled successfully");
    } catch (error) {
      console.error("Error disabling auto-confirm:", error);
      setError((error as Error).message || "Failed to disable auto-confirm");
    }
  };

  const handleGetAutoConfirmStatus = async () => {
    if (!sdk || !sdk.isConnected() || providerType !== "injected") {
      setError("Auto-confirm is only available for injected provider");
      return;
    }

    try {
      const status = await sdk.getAutoConfirmStatus();
      console.log("Auto-confirm status:", status);
      alert(`Auto-confirm status:\nEnabled: ${status.enabled}\nChains: ${status.chains.join(", ")}`);
    } catch (error) {
      console.error("Error getting auto-confirm status:", error);
      setError((error as Error).message || "Failed to get auto-confirm status");
    }
  };

  const handleGetSupportedChains = async () => {
    if (!sdk || !sdk.isConnected() || providerType !== "injected") {
      setError("Auto-confirm is only available for injected provider");
      return;
    }

    try {
      const supportedChains = await sdk.getSupportedAutoConfirmChains();
      console.log("Supported auto-confirm chains:", supportedChains);
      alert(`Supported chains for auto-confirm:\n${supportedChains.chains.join(", ")}`);
    } catch (error) {
      console.error("Error getting supported chains:", error);
      setError((error as Error).message || "Failed to get supported chains");
    }
  };

  // Provider type change handler
  const handleProviderTypeChange = async (newType: ProviderType) => {
    if (sdk && sdk.isConnected()) {
      await sdk.disconnect();
    }

    setProviderType(newType);
    setIsConnected(false);
    setAddresses([]);
    setBalance(null);
    setError(null);
  };

  // Clear debug messages
  const clearDebugMessages = () => {
    setDebugMessages([]);
  };

  // Update debug level
  const handleDebugLevelChange = (level: DebugLevel) => {
    setDebugLevel(level);
    debug.setLevel(level);
  };

  const hasBalance = balance !== null && balance > 0.001;

  return (
    <div className="app">
      <header className="header">
        <h1>🔮 Phantom Browser SDK - React Demo</h1>
        <p>Test both injected and embedded wallet functionality</p>
      </header>

      {/* Provider Configuration */}
      <section className="provider-section">
        <h2>Provider Configuration</h2>
        <div className="input-group">
          <label>Provider Type:</label>
          <select
            value={providerType}
            onChange={e => handleProviderTypeChange(e.target.value as ProviderType)}
            disabled={isConnected}
          >
            <option value="injected">Injected (Phantom Extension)</option>
            <option value="embedded">Embedded (User Wallet)</option>
          </select>
        </div>

        {!isConnected && providerType === "embedded" && (
          <div className="provider-controls">
            <button onClick={handleConnectWithPhantom} disabled={isLoading} className="primary">
              {isLoading ? "Connecting..." : "Login with Phantom"}
            </button>
            <button onClick={handleConnectWithGoogle} disabled={isLoading} className="primary">
              {isLoading ? "Connecting..." : "Connect with Google"}
            </button>
            <button onClick={handleConnect} disabled={isLoading}>
              {isLoading ? "Connecting..." : "Connect (Default)"}
            </button>
          </div>
        )}

        {!isConnected && providerType === "injected" && (
          <div className="provider-controls">
            <button onClick={handleConnect} disabled={isLoading} className="primary">
              {isLoading ? "Connecting..." : "Connect"}
            </button>
          </div>
        )}

        {isConnected && (
          <div className="provider-controls">
            <button onClick={handleGetAddresses}>Get Addresses</button>
            <button onClick={handleDisconnect}>Disconnect</button>
          </div>
        )}

        {/* Status Display */}
        <div className={`status ${isConnected ? "connected" : error ? "error" : "disconnected"}`}>
          {isLoading
            ? "Connecting..."
            : isConnected
              ? `✅ Connected with ${addresses.length} addresses`
              : error
                ? `❌ Error: ${error}`
                : "⚫ Not connected"}
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "10px" }}>
              Clear
            </button>
          </div>
        )}
      </section>

      {/* Addresses Section */}
      {addresses.length > 0 && (
        <section className="provider-section">
          <h2>Connected Addresses</h2>
          <div className="addresses">
            {addresses.map((addr, index) => (
              <div key={index} className="address-item">
                <div className="type">{addr.addressType.toUpperCase()}</div>
                <div className="address">{addr.address}</div>
              </div>
            ))}
          </div>

          {balance !== null && (
            <div className="balance-card">
              <div className="balance-info">
                <span className="balance-label">Solana Balance:</span>
                <span className="balance-value">{balance.toFixed(4)} SOL</span>
              </div>
              <button onClick={() => updateBalance()} className="balance-refresh-btn">
                Refresh
              </button>
            </div>
          )}
        </section>
      )}

      {/* Actions Section */}
      {isConnected && (
        <section className="provider-section">
          <h2>Wallet Actions</h2>
          <div className="provider-controls">
            <button onClick={handleSignMessage}>Sign Message (Solana)</button>
            <button
              onClick={handleSignEvmMessage}
              disabled={!addresses.find(a => a.addressType === AddressType.ethereum)}
            >
              Sign Message (EVM)
            </button>
            <button
              onClick={handleSignTypedData}
              disabled={!addresses.find(a => a.addressType === AddressType.ethereum)}
            >
              Sign Typed Data (EVM)
            </button>
            <button onClick={handleSignSolanaTransaction} disabled={!hasBalance || isLoading}>
              Sign Transaction (Solana)
            </button>
            <button
              onClick={handleSignEthTransaction}
              disabled={!addresses.find(a => a.addressType === AddressType.ethereum) || isLoading}
            >
              Sign Transaction (Ethereum)
            </button>
            <button
              onClick={handleEthSignTransactionRPC}
              disabled={!addresses.find(a => a.addressType === AddressType.ethereum) || isLoading}
            >
              Sign Transaction via RPC (Ethereum)
            </button>
            <button onClick={handleSignAndSendSolanaTransaction} disabled={!hasBalance || isLoading}>
              Sign & Send Transaction (Solana)
            </button>
            <button
              onClick={handleSignAndSendEthTransaction}
              disabled={!addresses.find(a => a.addressType === AddressType.ethereum) || isLoading}
            >
              Sign & Send Transaction (Ethereum)
            </button>
            <button
              onClick={handleSendEthMainnet}
              disabled={!addresses.find(a => a.addressType === AddressType.ethereum) || isLoading}
            >
              Send 0.00001 ETH (Mainnet)
            </button>
            <button
              onClick={handleSendPolygon}
              disabled={!addresses.find(a => a.addressType === AddressType.ethereum) || isLoading}
            >
              Send 0.00001 POL (Polygon)
            </button>
          </div>
        </section>
      )}

      {/* Transaction Tests Section - Legacy section can be removed or updated */}
      {isConnected && hasBalance && (
        <section className="provider-section">
          <h2>Quick Transaction Tests</h2>
          <div className="provider-controls">
            <button onClick={handleSignAndSendSolanaTransaction} disabled={isLoading}>
              {isLoading ? "Testing..." : "Quick Solana Test (Sign & Send)"}
            </button>
            <button
              onClick={handleSignAndSendEthTransaction}
              disabled={!addresses.find(a => a.addressType === AddressType.ethereum) || isLoading}
            >
              {isLoading ? "Testing..." : "Quick Ethereum Test (Sign & Send)"}
            </button>
          </div>
        </section>
      )}

      {/* Auto-Confirm Section (Injected Provider Only) */}
      {isConnected && providerType === "injected" && (
        <section className="provider-section">
          <h2>Auto-Confirm (Injected Only)</h2>
          <div className="provider-controls">
            <button onClick={handleEnableAutoConfirm}>Enable Auto-Confirm</button>
            <button onClick={handleDisableAutoConfirm}>Disable Auto-Confirm</button>
            <button onClick={handleGetAutoConfirmStatus}>Get Status</button>
            <button onClick={handleGetSupportedChains}>Get Supported Chains</button>
          </div>
          <p style={{ fontSize: "0.9rem", color: "#ccc", marginTop: "0.5rem" }}>
            Auto-confirm will be enabled for Solana Devnet and Ethereum Mainnet
          </p>
        </section>
      )}

      {/* Debug Section */}
      <section className="provider-section">
        <h2>Debug Messages</h2>
        <div className="provider-controls">
          <label>
            <input type="checkbox" checked={showDebug} onChange={e => setShowDebug(e.target.checked)} />
            Show Debug Messages
          </label>
          <select value={debugLevel} onChange={e => handleDebugLevelChange(parseInt(e.target.value) as DebugLevel)}>
            <option value={DebugLevel.ERROR}>Error</option>
            <option value={DebugLevel.WARN}>Warn</option>
            <option value={DebugLevel.INFO}>Info</option>
            <option value={DebugLevel.DEBUG}>Debug</option>
          </select>
          <button onClick={clearDebugMessages}>Clear Messages</button>
        </div>

        {showDebug && (
          <div className="debug-container">
            {debugMessages.length === 0 ? (
              <p className="debug-empty">No debug messages yet...</p>
            ) : (
              debugMessages.slice(-20).map((msg, index) => (
                <div key={index} className="debug-message">
                  <div className="debug-header">
                    {new Date(msg.timestamp).toLocaleTimeString()} -{DebugLevel[msg.level]} - {msg.category}
                  </div>
                  <div className="debug-content">{msg.message}</div>
                  {msg.data && <pre className="debug-data">{JSON.stringify(msg.data, null, 2)}</pre>}
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
