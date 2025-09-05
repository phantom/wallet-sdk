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
  type ProviderType,
} from "@phantom/react-sdk";
import { SystemProgram, PublicKey, Connection, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { parseEther, parseGwei, numberToHex } from "viem";
import { useState } from "react";
import { Buffer } from "buffer";
import bs58 from "bs58";
import { useBalance } from "./hooks/useBalance";

interface SDKActionsProps {
  providerType: ProviderType;
  onDestroySDK?: () => void;
}

export function SDKActions({ providerType, onDestroySDK }: SDKActionsProps) {
  const { connect, isConnecting, error: connectError } = useConnect();
  const { disconnect, isDisconnecting } = useDisconnect();
  const { signMessage: signSolanaMessage, signAndSendTransaction } = useSolana();
  const {
    signPersonalMessage: signEthMessage,
    signTypedData: signEthTypedData,
    sendTransaction: sendEthTransaction,
  } = useEthereum();
  const { isConnected, currentProviderType } = usePhantom();
  const autoConfirm = useAutoConfirm();
  const addresses = useAccounts();
  const [isSigningMessageType, setIsSigningMessageType] = useState<"solana" | "evm" | null>(null);
  const [isSigningTypedData, setIsSigningTypedData] = useState(false);
  const [isSigningTransaction, setIsSigningTransaction] = useState(false);
  const [isSendingEthTransaction, setIsSendingEthTransaction] = useState(false);

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

  const onConnect = async () => {
    try {
      await connect();
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
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningMessageType(type);
      if (type === "solana") {
        const result = await signSolanaMessage("Hello from Phantom SDK!");
        alert(`Message Signed! Signature: ${bs58.encode(result.signature)}`);
      } else {
        const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
        if (!ethAddress) {
          alert("No Ethereum address found");
          return;
        }
        const message = "Hello from Phantom SDK!";
        const prefixedMessage = "0x" + Buffer.from(message, "utf8").toString("hex");
        const result = await signEthMessage(prefixedMessage, ethAddress.address);
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

      const result = await signEthTypedData(typedData);
      alert(`Typed Data Signed! Signature: ${result}`);
    } catch (error) {
      console.error("Error signing typed data:", error);
      alert(`Error signing typed data: ${(error as Error).message || error}`);
    } finally {
      setIsSigningTypedData(false);
    }
  };

  const onSignAndSendTransaction = async () => {
    if (!isConnected || !solanaAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningTransaction(true);
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

      const result = await signAndSendTransaction(transaction);

      alert(`Transaction sent! Signature: ${result.signature}`);
    } catch (error) {
      console.error("Error signing and sending transaction:", error);
      alert(`Error signing and sending transaction: ${(error as Error).message || error}`);
    } finally {
      setIsSigningTransaction(false);
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

      const result = await sendEthTransaction(transactionParams);
      alert(`Ethereum transaction sent! Hash: ${result}`);
    } catch (error) {
      console.error("Error sending Ethereum transaction:", error);
      alert(`Error sending Ethereum transaction: ${(error as Error).message || error}`);
    } finally {
      setIsSendingEthTransaction(false);
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
      {onDestroySDK && (
        <div className="section">
          <h3>SDK Instance</h3>
          <div className="status-card">
            <div className="status-row">
              <span className="status-label">Status:</span>
              <span className="status-value connected">Instantiated</span>
            </div>
          </div>
          <div className="button-group">
            <button onClick={onDestroySDK}>Destroy SDK Instance</button>
          </div>
        </div>
      )}

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
            addresses.map(address => (
              <div className="status-row">
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

      {providerType === "injected" && (
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
          <button onClick={() => onSignMessage("solana")} disabled={!isConnected || isSigningMessageType === "solana"}>
            {isSigningMessageType === "solana" ? "Signing..." : "Sign Message (Solana)"}
          </button>
          <button onClick={() => onSignMessage("evm")} disabled={!isConnected || isSigningMessageType === "evm"}>
            {isSigningMessageType === "evm" ? "Signing..." : "Sign Message (EVM)"}
          </button>
          <button onClick={onSignTypedData} disabled={!isConnected || isSigningTypedData}>
            {isSigningTypedData ? "Signing..." : "Sign Typed Data (EVM)"}
          </button>
          <button
            onClick={onSignAndSendTransaction}
            disabled={!isConnected || isSigningTransaction || !hasSolanaBalance}
          >
            {isSigningTransaction
              ? "Signing..."
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
                : "Send Transaction (Ethereum)"}
          </button>

          <button onClick={onDisconnect} disabled={!isConnected || isDisconnecting}>
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
        {connectError && <p className="error-text">Error: {connectError.message}</p>}
      </div>
    </>
  );
}
