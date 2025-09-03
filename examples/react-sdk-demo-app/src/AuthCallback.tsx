import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConnect, useAccounts, usePhantom } from "@phantom/react-sdk";
import { DebugConsole } from "./components/DebugConsole";
import "./AuthCallback.css";

export function AuthCallback() {
  const navigate = useNavigate();
  const { isConnected } = usePhantom();
  const { isConnecting, error: connectError } = useConnect();
  const addresses = useAccounts();

  // Monitor connect error
  useEffect(() => {
    if (connectError) {
      console.error("Auth callback error:", connectError);
      // Error will be captured by the debug system via the provider
    }
  }, [connectError]);

  const handleGoHome = () => {
    navigate("/");
  };

  const handleRetry = () => {
    window.location.reload();
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
                <div className="error-message">
                  {connectError.message || "An unknown error occurred during authentication."}
                </div>
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
          <DebugConsole />
        </div>
      </div>
    </div>
  );
}
