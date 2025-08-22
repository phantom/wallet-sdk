import { useState } from "react";
import { 
  useAccounts, 
  useDisconnect, 
  usePhantomUI,
  ConnectionModal,
  type ConnectOptions
} from "@phantom/react-ui";

export default function ConnectionDemo() {
  const { addresses } = useAccounts();
  const { disconnect } = useDisconnect();
  const { 
    connectionState, 
    showConnectionModal, 
    hideConnectionModal,
    connectWithProvider 
  } = usePhantomUI();

  const [connectOptions, setConnectOptions] = useState<ConnectOptions>({
    providerType: "injected",
  });

  const handleConnect = () => {
    showConnectionModal();
  };

  const handleDirectConnect = async (providerType: "injected" | "embedded") => {
    try {
      await connectWithProvider(
        providerType,
        providerType === "embedded" ? "user-wallet" : undefined
      );
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const isConnected = addresses.length > 0;

  return (
    <div className="demo-section">
      <h2>Connection Modal Demo</h2>
      <p>
        Test different connection configurations and see how the connection modal behaves 
        with various provider types and options.
      </p>

      <div className="config-section">
        <h3>Connection Configuration</h3>
        <div className="config-options">
          <label>
            Provider Type:
            <select 
              value={connectOptions.providerType}
              onChange={(e) => setConnectOptions(prev => ({
                ...prev,
                providerType: e.target.value as "injected" | "embedded"
              }))}
            >
              <option value="injected">Injected (Browser Extension)</option>
              <option value="embedded">Embedded (Mobile)</option>
            </select>
          </label>
          
          {connectOptions.providerType === "embedded" && (
            <label>
              Embedded Wallet Type:
              <select 
                value={connectOptions.embeddedWalletType || "user-wallet"}
                onChange={(e) => setConnectOptions(prev => ({
                  ...prev,
                  embeddedWalletType: e.target.value as "app-wallet" | "user-wallet"
                }))}
              >
                <option value="user-wallet">User Wallet</option>
                <option value="app-wallet">App Wallet</option>
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="demo-controls">
        <button onClick={handleConnect}>
          Show Connection Modal
        </button>
        
        <button 
          onClick={() => handleDirectConnect("injected")}
          className="secondary"
        >
          Connect Injected (Direct)
        </button>
        
        <button 
          onClick={() => handleDirectConnect("embedded")}
          className="secondary"
        >
          Connect Embedded (Direct)
        </button>
        
        {isConnected && (
          <button 
            onClick={disconnect}
            className="secondary"
          >
            Disconnect
          </button>
        )}
      </div>

      <div className="status-display">
        <h3>Connection Status</h3>
        <pre>{JSON.stringify({
          isConnected,
          accounts: accounts.map(account => ({
            address: account.address,
            publicKey: account.publicKey?.toString(),
          })),
          modalState: {
            isVisible: connectionState.isVisible,
            isConnecting: connectionState.isConnecting,
            providerType: connectionState.providerType,
            error: connectionState.error?.message,
          }
        }, null, 2)}</pre>
      </div>

      <div className="status-display">
        <h3>Current Configuration</h3>
        <pre>{JSON.stringify(connectOptions, null, 2)}</pre>
      </div>

      <ConnectionModal />
    </div>
  );
}