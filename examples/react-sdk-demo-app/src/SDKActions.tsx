import "./Actions.css";
import { useConnect, useDisconnect, useAccounts, usePhantom } from "@phantom/react-sdk";

export function SDKActions() {
  const { connect, isConnecting, error: connectError } = useConnect();
  const { disconnect, isDisconnecting } = useDisconnect();
  const { isConnected, currentProviderType, sdk } = usePhantom();
  const addresses = useAccounts();

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

  const onDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Error disconnecting:", error);
      alert(`Error disconnecting: ${(error as Error).message || error}`);
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
        </div>
      </div>

      <div className="section">
        <h3>Connection Options</h3>
        <div className="button-group">
          <button
            className={`${!isConnected ? "primary" : ""}`}
            onClick={onConnectInjected}
            disabled={isConnected || isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect Injected"}
          </button>
          <button
            className={`${!isConnected ? "primary" : ""}`}
            onClick={onConnectWithGoogle}
            disabled={isConnected || isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect with Google"}
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
