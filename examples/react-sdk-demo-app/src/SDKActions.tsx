import "./Actions.css";
import {
  useConnect,
  useDisconnect,
  useSolana,
  useEthereum,
  useAccounts,
  usePhantom,
  useAutoConfirm,
  NetworkId,
} from "@phantom/react-sdk";
import { SystemProgram, PublicKey, Connection, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { parseEther, parseGwei, numberToHex } from "viem";
import { useState } from "react";
import { Buffer } from "buffer";
import bs58 from "bs58";
import { useBalance } from "./hooks/useBalance";

export function SDKActions() {
  const { connect, isConnecting, error: connectError } = useConnect();
  const { disconnect, isDisconnecting } = useDisconnect();
  const { solana } = useSolana();
  const { ethereum } = useEthereum();
  const { isConnected, currentProviderType, sdk } = usePhantom();
  const autoConfirm = useAutoConfirm();
  const addresses = useAccounts();
  const [isSigningMessageType, setIsSigningMessageType] = useState<"solana" | "evm" | null>(null);
  const [isSigningTypedData, setIsSigningTypedData] = useState(false);
  const [isSigningOnlyTransaction, setIsSigningOnlyTransaction] = useState<"solana" | "ethereum" | null>(null);
  const [isSigningAndSendingTransaction, setIsSigningAndSendingTransaction] = useState(false);
  const [isSendingEthTransaction, setIsSendingEthTransaction] = useState(false);
  const [isSigningAllTransactions, setIsSigningAllTransactions] = useState(false);

  const solanaAddress = addresses?.find(addr => addr.addressType === "Solana")?.address || null;
  const ethereumAddress = addresses?.find(addr => addr.addressType === "Ethereum")?.address || null;

  // Use balance hook
  const {
    balance: solanaBalance,
    loading: solanaBalanceLoading,
    error: solanaBalanceError,
    refetch: refetchSolanaBalance,
  } = useBalance(solanaAddress);
  const hasSolanaBalance = solanaBalance !== null && solanaBalance > 0;

  const {
    balance: ethereumBalance,
    loading: ethereumBalanceLoading,
    error: ethereumBalanceError,
    refetch: refetchEthereumBalance,
  } = useBalance(ethereumAddress);
  const hasEthereumBalance = ethereumBalance !== null && ethereumBalance > 0;

  const onConnectInjected = async () => {
    try {
      // Switch to injected provider before connecting
      if (sdk) {
        await sdk.switchProvider("injected");
      }
      await connect();
    } catch (error) {
      console.error("Error connecting to injected provider:", error);
      alert(`Error connecting: ${(error as Error).message || error}`);
    }
  };

  const onConnectWithGoogle = async () => {
    try {
      // Switch to embedded provider if needed
      if (sdk) {
        await sdk.switchProvider("embedded");
      }
      // Connect with Google auth provider
      await connect({
        provider: "google",
      });
    } catch (error) {
      console.error("Error connecting with Google:", error);
      alert(`Error connecting: ${(error as Error).message || error}`);
    }
  };

  const onConnectWithPhantom = async () => {
    try {
      // Switch to embedded provider if needed
      if (sdk) {
        await sdk.switchProvider("embedded");
      }
      // Connect with Phantom auth provider (uses extension)
      await connect({
        provider: "phantom",
      });
    } catch (error) {
      console.error("Error connecting with Phantom:", error);
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
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningMessageType(type);
      if (type === "solana") {
        const result = await solana.signMessage("Hello from Phantom SDK!");
        if (!result) {
          alert("Solana chain not available");
          return;
        }
        alert(`Message Signed! Signature: ${bs58.encode(result.signature)}`);
      } else {
        const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
        if (!ethAddress) {
          alert("No Ethereum address found");
          return;
        }
        const message = "Hello from Phantom SDK!";
        const prefixedMessage = "0x" + Buffer.from(message, "utf8").toString("hex");
        const result = await ethereum?.signPersonalMessage(prefixedMessage, ethAddress.address);
        if (!result) {
          alert("Ethereum chain not available");
          return;
        }
        alert(`Message Signed! Signature: ${result}`);
      }
    } catch (error) {
      console.error("Error signing message:", error);
      alert(`Error signing message: ${(error as Error).message || error}`);
    } finally {
      setIsSigningMessageType(null);
    }
  };

  const onSignTypedData = async () => {
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }

    const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
    if (!ethAddress) {
      alert("No Ethereum address found");
      return;
    }

    try {
      setIsSigningTypedData(true);

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
          contents: "Hello, Bob! This is a typed data message from Phantom React SDK Demo.",
        },
      };

      const result = await ethereum?.signTypedData(typedData, ethAddress.address);
      if (!result) {
        alert("Ethereum chain not available");
        return;
      }
      alert(`Typed Data Signed! Signature: ${result}`);
    } catch (error) {
      console.error("Error signing typed data:", error);
      alert(`Error signing typed data: ${(error as Error).message || error}`);
    } finally {
      setIsSigningTypedData(false);
    }
  };

  const onSignTransaction = async (type: "solana" | "ethereum") => {
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningOnlyTransaction(type);
      if (type === "solana") {
        if (!solanaAddress) {
          alert("No Solana address found");
          return;
        }
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

        const result = await solana.signTransaction(transaction);
        if (!result) {
          alert("Solana chain not available");
          return;
        }
        alert(`Transaction signed! Signature: ${JSON.stringify(result)}`);
      } else {
        // Ethereum
        const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
        if (!ethAddress) {
          alert("No Ethereum address found");
          return;
        }

        // Create simple ETH transfer with proper hex formatting
        const transactionParams = {
          from: ethAddress.address,
          to: ethAddress.address, // Self-transfer for demo
          value: numberToHex(parseEther("0.001")), // 0.001 ETH in hex
          gas: numberToHex(21000n), // Gas limit in hex
          gasPrice: numberToHex(parseGwei("20")), // 20 gwei in hex
        };

        const result = await ethereum?.signTransaction(transactionParams);
        if (!result) {
          alert("Ethereum chain not available");
          return;
        }
        alert(`Transaction signed! Signature: ${result}`);
      }
    } catch (error) {
      console.error("Error signing transaction:", error);
      alert(`Error signing transaction: ${(error as Error).message || error}`);
    } finally {
      setIsSigningOnlyTransaction(null);
    }
  };

  const onSignAndSendTransaction = async () => {
    if (!isConnected || !solanaAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningAndSendingTransaction(true);
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

      const result = await solana.signAndSendTransaction(transaction);
      if (!result) {
        alert("Solana chain not available");
        return;
      }

      alert(`Transaction sent! Signature: ${result.signature}`);
    } catch (error) {
      console.error("Error signing and sending transaction:", error);
      alert(`Error signing and sending transaction: ${(error as Error).message || error}`);
    } finally {
      setIsSigningAndSendingTransaction(false);
    }
  };

  const onSendEthTransaction = async () => {
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }

    const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
    if (!ethAddress) {
      alert("No Ethereum address found");
      return;
    }

    try {
      setIsSendingEthTransaction(true);

      // Create simple ETH transfer with proper hex formatting
      const transactionParams = {
        from: ethAddress.address,
        to: ethAddress.address, // Self-transfer for demo
        value: numberToHex(parseEther("0.001")), // 0.001 ETH in hex
        gas: numberToHex(21000n), // Gas limit in hex
        gasPrice: numberToHex(parseGwei("20")), // 20 gwei in hex
      };

      const result = await ethereum?.sendTransaction(transactionParams);
      if (!result) {
        alert("Ethereum chain not available");
        return;
      }
      alert(`Ethereum transaction sent! Hash: ${result}`);
    } catch (error) {
      console.error("Error sending Ethereum transaction:", error);
      alert(`Error sending Ethereum transaction: ${(error as Error).message || error}`);
    } finally {
      setIsSendingEthTransaction(false);
    }
  };

  const onSignAllTransactions = async () => {
    if (!isConnected || !solanaAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningAllTransactions(true);
      // Create connection to get recent blockhash
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create 2 transactions for demo
      const transactions = [];
      for (let i = 0; i < 2; i++) {
        const transferInstruction = SystemProgram.transfer({
          fromPubkey: new PublicKey(solanaAddress),
          toPubkey: new PublicKey(solanaAddress), // Self-transfer for demo
          lamports: 1000 + i, // Slightly different amounts: 0.000001 and 0.000002 SOL
        });

        const messageV0 = new TransactionMessage({
          payerKey: new PublicKey(solanaAddress),
          recentBlockhash: blockhash,
          instructions: [transferInstruction],
        }).compileToV0Message();

        transactions.push(new VersionedTransaction(messageV0));
      }

      const results = await solana.signAllTransactions(transactions);
      if (!results) {
        alert("Solana chain not available");
        return;
      }
      alert(`All transactions signed! Results: ${JSON.stringify(results)}`);
    } catch (error) {
      console.error("Error signing all transactions:", error);
      alert(`Error signing all transactions: ${(error as Error).message || error}`);
    } finally {
      setIsSigningAllTransactions(false);
    }
  };

  // Auto-confirm handlers
  const onEnableAutoConfirm = async () => {
    try {
      const result = await autoConfirm.enable({
        chains: [NetworkId.SOLANA_DEVNET, NetworkId.ETHEREUM_MAINNET],
      });
      alert(`Auto-confirm enabled for ${result.chains.length} chains!`);
    } catch (error) {
      console.error("Error enabling auto-confirm:", error);
      alert(`Error enabling auto-confirm: ${(error as Error).message || error}`);
    }
  };

  const onDisableAutoConfirm = async () => {
    try {
      await autoConfirm.disable();
      alert("Auto-confirm disabled!");
    } catch (error) {
      console.error("Error disabling auto-confirm:", error);
      alert(`Error disabling auto-confirm: ${(error as Error).message || error}`);
    }
  };

  return (
    <>
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
          {addresses &&
            addresses.map((address, index) => (
              <div key={index} className="status-row">
                <span className="status-label">{address.addressType}:</span>
                <span className="status-value address">{address.address}</span>
              </div>
            ))}
          {addresses && addresses.length > 1 && (
            <div className="status-row">
              <span className="status-label">Total:</span>
              <span className="status-value">{addresses.length} addresses</span>
            </div>
          )}
        </div>
      </div>

      {!isConnected && (
        <div className="section">
          <h3>Connection Options</h3>
          <div className="button-group">
            <button className="primary" onClick={onConnectWithPhantom} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Login with Phantom"}
            </button>
            <button className="primary" onClick={onConnectWithGoogle} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect with Google"}
            </button>
            <button className="primary" onClick={onConnectInjected} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Injected"}
            </button>
          </div>
          {connectError && <p className="error-text">Error: {connectError.message}</p>}
        </div>
      )}

      {isConnected && solanaAddress && (
        <div className="section">
          <h3>SOL Balance</h3>
          <div className="balance-card">
            <div className="balance-row">
              <span className="balance-label">Balance:</span>
              <span className="balance-value">
                {solanaBalanceLoading
                  ? "Loading..."
                  : solanaBalanceError
                    ? "Error"
                    : solanaBalance !== null
                      ? `${solanaBalance.toFixed(4)} SOL`
                      : "--"}
              </span>
            </div>
            <button className="small" onClick={() => refetchSolanaBalance()} disabled={solanaBalanceLoading}>
              {solanaBalanceLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {solanaBalanceError && <p className="error-text">Balance error: {solanaBalanceError}</p>}
        </div>
      )}

      {isConnected && ethereumAddress && (
        <div className="section">
          <h3>ETH Balance</h3>
          <div className="balance-card">
            <div className="balance-row">
              <span className="balance-label">Balance:</span>
              <span className="balance-value">
                {ethereumBalanceLoading
                  ? "Loading..."
                  : ethereumBalanceError
                    ? "Error"
                    : ethereumBalance !== null
                      ? `${ethereumBalance.toFixed(4)} ETH`
                      : "--"}
              </span>
            </div>
            <button className="small" onClick={() => refetchEthereumBalance()} disabled={ethereumBalanceLoading}>
              {ethereumBalanceLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {ethereumBalanceError && <p className="error-text">Balance error: {ethereumBalanceError}</p>}
        </div>
      )}

      {isConnected && currentProviderType === "injected" && (
        <div className="section">
          <h3>Auto-Confirm Settings</h3>
          <div className="status-card">
            <div className="status-row">
              <span className="status-label">Status:</span>
              <span className={`status-value ${autoConfirm.status?.enabled ? "connected" : "disconnected"}`}>
                {autoConfirm.isLoading ? "Loading..." : autoConfirm.status?.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            {autoConfirm.status?.enabled && autoConfirm.status.chains.length > 0 && (
              <div className="status-row">
                <span className="status-label">Active Chains:</span>
                <span className="status-value">{autoConfirm.status.chains.length}</span>
              </div>
            )}
            {autoConfirm.supportedChains && autoConfirm.supportedChains.chains.length > 0 && (
              <div className="status-row">
                <span className="status-label">Supported:</span>
                <span className="status-value">{autoConfirm.supportedChains.chains.length} chains</span>
              </div>
            )}
          </div>

          <div className="button-group">
            <button
              onClick={onEnableAutoConfirm}
              disabled={autoConfirm.isLoading || autoConfirm.status?.enabled}
              className="small"
            >
              {autoConfirm.isLoading ? "Loading..." : "Enable Auto-Confirm"}
            </button>
            <button
              onClick={onDisableAutoConfirm}
              disabled={autoConfirm.isLoading || !autoConfirm.status?.enabled}
              className="small"
            >
              {autoConfirm.isLoading ? "Loading..." : "Disable Auto-Confirm"}
            </button>
            <button onClick={autoConfirm.refetch} disabled={autoConfirm.isLoading} className="small">
              {autoConfirm.isLoading ? "Loading..." : "Refresh Status"}
            </button>
          </div>

          {autoConfirm.error && <p className="error-text">Auto-confirm error: {autoConfirm.error.message}</p>}
        </div>
      )}

      {isConnected && (
        <div className="section">
          <h3>Wallet Operations</h3>
          <div className="button-group">
            <button
              onClick={() => onSignMessage("solana")}
              disabled={!isConnected || isSigningMessageType === "solana"}
            >
              {isSigningMessageType === "solana" ? "Signing..." : "Sign Message (Solana)"}
            </button>
            <button onClick={() => onSignMessage("evm")} disabled={!isConnected || isSigningMessageType === "evm"}>
              {isSigningMessageType === "evm" ? "Signing..." : "Sign Message (EVM)"}
            </button>
            <button onClick={onSignTypedData} disabled={!isConnected || isSigningTypedData}>
              {isSigningTypedData ? "Signing..." : "Sign Typed Data (EVM)"}
            </button>
            <button
              onClick={() => onSignTransaction("solana")}
              disabled={!isConnected || isSigningOnlyTransaction === "solana" || !hasSolanaBalance}
            >
              {isSigningOnlyTransaction === "solana"
                ? "Signing..."
                : !hasSolanaBalance
                  ? "Insufficient Balance"
                  : "Sign Transaction (Solana)"}
            </button>
            <button
              onClick={() => onSignTransaction("ethereum")}
              disabled={!isConnected || isSigningOnlyTransaction === "ethereum" || !hasEthereumBalance}
            >
              {isSigningOnlyTransaction === "ethereum"
                ? "Signing..."
                : !hasEthereumBalance
                  ? "Insufficient Balance"
                  : "Sign Transaction (Ethereum)"}
            </button>
            <button
              onClick={onSignAndSendTransaction}
              disabled={!isConnected || isSigningAndSendingTransaction || !hasSolanaBalance}
            >
              {isSigningAndSendingTransaction
                ? "Signing & Sending..."
                : !hasSolanaBalance
                  ? "Insufficient Balance"
                  : "Sign & Send Transaction (Solana)"}
            </button>
            <button
              onClick={onSendEthTransaction}
              disabled={!isConnected || isSendingEthTransaction || !hasEthereumBalance}
            >
              {isSendingEthTransaction
                ? "Sending..."
                : !hasEthereumBalance
                  ? "Insufficient Balance"
                  : "Sign & Send Transaction (Ethereum)"}
            </button>
            <button
              onClick={onSignAllTransactions}
              disabled={!isConnected || isSigningAllTransactions || !hasSolanaBalance}
            >
              {isSigningAllTransactions
                ? "Signing All..."
                : !hasSolanaBalance
                  ? "Insufficient Balance"
                  : "Sign All Transactions (Solana)"}
            </button>

            <button onClick={onDisconnect} disabled={!isConnected || isDisconnecting}>
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
