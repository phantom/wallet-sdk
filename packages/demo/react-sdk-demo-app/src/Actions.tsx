import "./Actions.css";
import { useAccount, useConnect, useDisconnect } from "@phantom/react-sdk/solana";

export function Actions() {
  const { publicKey, status } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const onConnect = async () => {
    try {
      const connectResult = await connect();
      if (connectResult) {
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
      <div className="account-info">
        <p>
          <strong>Account Public Key:</strong> {publicKey}
        </p>
        <p>
          <strong>Account Status:</strong> {status}
        </p>
      </div>
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
