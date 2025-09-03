import "./Actions.css";
import { type ProviderType, useIsExtensionInstalled } from "@phantom/react-sdk";
import { DebugConsole } from "./components/DebugConsole";

interface ConfigurationFormProps {
  providerType: ProviderType;
  setProviderType: (type: ProviderType) => void;
  embeddedWalletType: "user-wallet" | "app-wallet";
  setEmbeddedWalletType: (type: "user-wallet" | "app-wallet") => void;
  onCreateSDK: () => void;
}

export function ConfigurationForm({
  providerType,
  setProviderType,
  embeddedWalletType,
  setEmbeddedWalletType,
  onCreateSDK,
}: ConfigurationFormProps) {
  const { isInstalled, isLoading } = useIsExtensionInstalled();

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
                    checked={providerType === "embedded"}
                    onChange={e => setProviderType(e.target.value as ProviderType)}
                  />
                  <span>Embedded (Non-Custodial)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="injected"
                    checked={providerType === "injected"}
                    onChange={e => setProviderType(e.target.value as ProviderType)}
                  />
                  <span>Injected (Browser Extension)</span>
                </label>
              </div>
            </div>

            {providerType === "embedded" && (
              <div className="form-group">
                <label>Embedded Wallet Type:</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="user-wallet"
                      checked={embeddedWalletType === "user-wallet"}
                      onChange={() => setEmbeddedWalletType("user-wallet")}
                    />
                    <span>User Wallet (Google Auth)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="app-wallet"
                      checked={embeddedWalletType === "app-wallet"}
                      onChange={() => setEmbeddedWalletType("app-wallet")}
                    />
                    <span>App Wallet (Fresh wallet)</span>
                  </label>
                </div>
              </div>
            )}

            {providerType === "injected" && (
              <div className="extension-status">
                {isLoading && <p className="status-text">Checking extension...</p>}
                {!isLoading && isInstalled && <p className="status-success">✓ Phantom extension installed</p>}
                {!isLoading && !isInstalled && <p className="status-error">✗ Phantom extension not installed</p>}
              </div>
            )}
          </div>

          <div className="section">
            <h3>SDK Instance</h3>
            <div className="status-card">
              <div className="status-row">
                <span className="status-label">Status:</span>
                <span className="status-value disconnected">Not Instantiated</span>
              </div>
            </div>
            <div className="button-group">
              <button className="primary" onClick={onCreateSDK} disabled={providerType === "injected" && !isInstalled}>
                Create SDK Instance
              </button>
            </div>
            {providerType === "injected" && !isInstalled && (
              <p className="error-text">Please install the Phantom extension first</p>
            )}
          </div>
        </div>

        <div className="right-panel">
          <DebugConsole />
        </div>
      </div>
    </div>
  );
}
