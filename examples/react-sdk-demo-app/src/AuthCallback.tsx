import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useConnect, useAccounts, debug, DebugLevel, type DebugMessage, usePhantom } from "@phantom/react-sdk";
import "./AuthCallback.css";


export function AuthCallback() {
  const navigate = useNavigate();
  const { isConnected} = usePhantom();
  const { isConnecting,  error: connectError } = useConnect();
  const addresses = useAccounts();

 

  // Debug state
  const [debugMessages, setDebugMessages] = useState<DebugMessage[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const [debugLevel, setDebugLevel] = useState<DebugLevel>(DebugLevel.DEBUG);

  // Debug callback function
  const handleDebugMessage = useCallback((message: DebugMessage) => {
    setDebugMessages(prev => {
      const newMessages = [...prev, message];
      // Keep only last 100 messages to prevent memory issues
      return newMessages;
    });
  }, []);

  // Initialize debug system
  useEffect(() => {
    debug.setCallback(handleDebugMessage);
    debug.setLevel(debugLevel);
    debug.enable();
  }, [handleDebugMessage, debugLevel]);


  // Monitor connect error
  useEffect(() => {
    if (connectError) {
      console.error("Auth callback error:", connectError);
      debug.error("AUTH_CALLBACK", "Authentication failed", { error: connectError.message });
     
    }
  }, [connectError]);

  const handleGoHome = () => {
    navigate("/");
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const clearDebugMessages = () => {
    setDebugMessages([]);
  };

  return (
    <div id="app">
      <h1>Phantom Authentication</h1>

      <div className="main-layout">
        <div className="left-panel">
          <div className="section">
            {/* Loading State */}
            {isConnecting && (
              <div className="auth-status">
                <div className="loading-spinner"></div>
                <h3>Connecting...</h3>
              </div>
            )}

            {/* Success State */}
            {isConnected && (
              <div className="auth-success">
                <div className="success-icon">✓</div>
                <h3>Authentication Successful</h3>
                <p>You are now connected to your wallet.</p>
                <div className="wallet-info">
                  
                  <div className="info-row">
                    <span className="label">Addresses:</span>
                    <div className="addresses">
                      {addresses && addresses.length > 0 ? (
                        addresses.map((addr, index) => (
                          <div key={index} className="address-item">
                            <span className="address-type">{addr.addressType}:</span>
                            <span className="address-value">{addr.address}</span>
                          </div>
                        ))
                      ) : (
                        <div className="address-item">No addresses available</div>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={handleGoHome} className="primary">
                  Go to Main App
                </button>
              </div>
            )}

            {/* Error State */}
            {connectError && (
              <div className="auth-error">
                <div className="error-icon">✗</div>
                <h3>Authentication Failed</h3>
                <div className="error-message">{connectError.message || "An unknown error occurred during authentication."}</div>
                <div className="button-group">
                  <button onClick={handleRetry}>Retry Authentication</button>
                  <button onClick={handleGoHome} className="primary">
                    Go to Main App
                  </button>
                </div>
              </div>
            )}
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
              {debugMessages.map((msg, index) => {
                const levelClass = DebugLevel[msg.level].toLowerCase();
                const timestamp = new Date(msg.timestamp).toLocaleTimeString();
                const dataStr = msg.data ? JSON.stringify(msg.data, null, 2) : "";

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
              {debugMessages.length === 0 && <div className="debug-empty">Initializing debug system...</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
