import * as React from "react";
import "./Actions.css";
import { useConnect, useDisconnect } from "@phantom/react-sdk/solana";

export function Actions() {
  const [publicKey, setPublicKey] = React.useState<string | null>(null);
  const connect = useConnect();
  const disconnect = useDisconnect();

  const onConnect = async () => {
    try {
      const connectResult = await connect();
      if (connectResult) {
        setPublicKey(connectResult);
        alert(`Connected to Phantom with public key: ${connectResult}`);
      } else {
        alert("Connected, but public key was not retrieved.");
      }
    } catch (error) {
      console.error("Error connecting to Phantom:", error);
      alert(`Error connecting: ${(error as Error).message || error}`);
    }
  };

  const onDisconnect = async () => {
    await disconnect();
    alert("Disconnected from Phantom");
  };

  return (
    <div id="app">
      <h1>Phantom React SDK Demo</h1>
      <div className="controls">
        <button id="connectBtn" onClick={onConnect}>
          Connect
        </button>
        <button id="signMessageBtn" disabled={!publicKey}>
          Sign Message
        </button>
        <button id="signTransactionBtn" disabled={!publicKey}>
          Sign Transaction
        </button>
        <button id="disconnectBtn" onClick={onDisconnect} disabled={!publicKey}>
          Disconnect
        </button>
      </div>
    </div>
  );
}
