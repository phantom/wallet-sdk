import "./Actions.css";
import {
  useConnect,
  useDisconnect,
  useSignAndSendTransaction,
  useSignMessage,
  useAccounts,
  usePhantom,
  NetworkId,
  stringToBase64url,
  base64urlEncode
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
  const { connection, isReady } = usePhantom();
  const addresses = useAccounts();
  
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);

  // Extract Solana address when addresses change
  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const solAddr = addresses.find(addr => addr.addressType === 'Solana');
      setSolanaAddress(solAddr?.address || null);
    } else {
      setSolanaAddress(null);
    }
  }, [addresses]);

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

  const onSignMessage = async () => {
    if (!connection?.connected || !solanaAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      // Convert message to base64url as required by the new SDK
      const message = stringToBase64url("Hello from Phantom React SDK Demo!");
      const signature = await signMessage({
        message,
        networkId: NetworkId.SOLANA_MAINNET
      });
      alert(`Message Signed! Signature: ${signature}`);
    } catch (error) {
      console.error("Error signing message:", error);
      alert(`Error signing message: ${(error as Error).message || error}`);
    }
  };

  const onSignAndSendTransaction = async () => {
    if (!connection?.connected || !solanaAddress) {
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
      
      // Convert transaction to base64url for both embedded and injected wallets
      // For @solana/kit transactions, use transaction.messageBytes which contains the serialized bytes
      const transactionBase64 = base64urlEncode(transaction.messageBytes);

      const result = await signAndSendTransaction({
        transaction: transactionBase64,
        networkId: NetworkId.SOLANA_MAINNET
      });
      
      alert(`Transaction sent! Signature: ${result.rawTransaction}`);
    } catch (error) {
      console.error("Error signing and sending transaction:", error);
      alert(`Error signing and sending transaction: ${(error as Error).message || error}`);
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
          <strong>Connection Status:</strong> {connection?.connected ? 'Connected' : 'Not Connected'}
        </p>
        {solanaAddress && (
          <p>
            <strong>Solana Address:</strong> {solanaAddress}
          </p>
        )}
        {addresses && addresses.length > 0 && (
          <div>
            <p><strong>All Addresses:</strong></p>
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

      <div className="plugin-section">
        <h2>Wallet Actions</h2>
        <div className="controls">
          <button 
            id="connectBtn" 
            onClick={onConnect} 
            disabled={connection?.connected || isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
          <button 
            id="signMessageBtn" 
            onClick={onSignMessage} 
            disabled={!connection?.connected || isSigningMessage}
          >
            {isSigningMessage ? 'Signing...' : 'Sign Message'}
          </button>
          <button 
            id="signAndSendTransactionBtn" 
            onClick={onSignAndSendTransaction} 
            disabled={!connection?.connected || isSigningTransaction}
          >
            {isSigningTransaction ? 'Signing...' : 'Sign and Send Transaction'}
          </button>
          <button 
            id="disconnectBtn" 
            onClick={onDisconnect} 
            disabled={!connection?.connected || isDisconnecting}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
        {connectError && (
          <p style={{ color: 'red' }}>
            Connection Error: {connectError.message}
          </p>
        )}
      </div>

      <div className="info-section">
        <h3>Note:</h3>
        <p>This demo uses the Phantom browser extension (injected provider).</p>
        <p>Make sure you have the Phantom wallet extension installed.</p>
        <p>Currently, only Solana network is supported for injected wallets.</p>
      </div>
    </div>
  );
}