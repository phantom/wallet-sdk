import React, { useState, useEffect } from "react";
import { usePhantomUI } from "../PhantomUIProvider";
import { usePhantom } from "@phantom/react-sdk";

declare global {
  interface Window {
    phantom?: any;
  }
}

export function ConnectionModal() {
  const { connectionState, hideConnectionModal, connectWithProvider } = usePhantomUI();
  const { isPhantomAvailable } = usePhantom();
  const [phantomDetected, setPhantomDetected] = useState(isPhantomAvailable);
  const [isDetecting, setIsDetecting] = useState(false);

  // Detect Phantom extension with interval checks
  useEffect(() => {
    if (!connectionState.isVisible || phantomDetected) return;

    setIsDetecting(true);
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds at 100ms intervals

    const checkPhantom = () => {
      if (window.phantom) {
        setPhantomDetected(true);
        setIsDetecting(false);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        setIsDetecting(false);
        return;
      }

      setTimeout(checkPhantom, 100);
    };

    const timeoutId = setTimeout(checkPhantom, 100);
    return () => clearTimeout(timeoutId);
  }, [connectionState.isVisible, phantomDetected]);

  if (!connectionState.isVisible) return null;

  const handleEmbeddedConnect = async () => {
    try {
      await connectWithProvider("embedded", "user-wallet");
    } catch (error) {
      console.error("Embedded connection failed:", error);
    }
  };

  const handlePhantomConnect = async () => {
    try {
      await connectWithProvider("injected");
    } catch (error) {
      console.error("Phantom extension connection failed:", error);
    }
  };

  const handleAppWalletConnect = async () => {
    try {
      await connectWithProvider("embedded", "app-wallet");
    } catch (error) {
      console.error("App wallet connection failed:", error);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !connectionState.isConnecting) {
      hideConnectionModal();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !connectionState.isConnecting) {
      hideConnectionModal();
    }
  };

  return (
    <div className="phantom-modal-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="phantom-modal">
        <div className="phantom-modal-header">
          <h2>Connect Wallet</h2>
          <button
            className="phantom-modal-close"
            onClick={hideConnectionModal}
            disabled={connectionState.isConnecting}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="phantom-modal-content">
          <p className="phantom-modal-subtitle">Choose how you'd like to connect</p>

          <div className="phantom-connection-options">
            {/* Primary Option: Embedded Wallet */}
            <button
              onClick={handleEmbeddedConnect}
              disabled={connectionState.isConnecting}
              className="phantom-button phantom-button-primary"
            >
              <div className="phantom-button-content">
                <div className="phantom-button-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <div className="phantom-button-text">
                  <span className="phantom-button-title">Continue with Google</span>
                  <span className="phantom-button-subtitle">Sign in to access your wallet</span>
                </div>
              </div>
            </button>

            {/* Secondary Option: Phantom Extension */}
            {(phantomDetected || isDetecting) && (
              <button
                onClick={handlePhantomConnect}
                disabled={connectionState.isConnecting || isDetecting}
                className="phantom-button phantom-button-secondary"
              >
                <div className="phantom-button-content">
                  <div className="phantom-button-icon">
                    {isDetecting ? (
                      <div className="phantom-spinner"></div>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    )}
                  </div>
                  <div className="phantom-button-text">
                    <span className="phantom-button-title">
                      {isDetecting ? "Detecting Phantom..." : "Phantom Extension"}
                    </span>
                    <span className="phantom-button-subtitle">Use your existing Phantom browser extension</span>
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Advanced Options */}
          <details className="phantom-advanced-options">
            <summary>Advanced Options</summary>
            <div className="phantom-advanced-content">
              <button
                onClick={handleAppWalletConnect}
                disabled={connectionState.isConnecting}
                className="phantom-button phantom-button-tertiary"
              >
                <div className="phantom-button-content">
                  <div className="phantom-button-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div className="phantom-button-text">
                    <span className="phantom-button-title">Create Fresh Wallet</span>
                    <span className="phantom-button-subtitle">New unfunded wallet for this app only</span>
                  </div>
                </div>
              </button>
            </div>
          </details>

          {/* Error State */}
          {connectionState.error && (
            <div className="phantom-error-message">
              <div className="phantom-error-icon">⚠️</div>
              <div className="phantom-error-text">
                <strong>Connection failed</strong>
                <span>{connectionState.error.message}</span>
              </div>
              <button onClick={() => setPhantomDetected(false)} className="phantom-retry-button">
                Try Again
              </button>
            </div>
          )}

          {/* Loading State */}
          {connectionState.isConnecting && (
            <div className="phantom-connecting-state">
              <div className="phantom-spinner"></div>
              <p>Connecting...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
