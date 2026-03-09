import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePhantom } from "@phantom/react-sdk";
import { DebugConsole } from "./components/DebugConsole";
import "./AuthCallback.css";

export function AuthCallback() {
  const navigate = useNavigate();
  const { isConnected, isConnecting, errors } = usePhantom();
  const connectError = errors.connect;

  useEffect(() => {
    if (isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  return (
    <div id="app">
      <h1>Phantom Authentication</h1>

      <div className="main-layout">
        <div className="left-panel">
          <div className="section">
            <h3>Auth2 Flow</h3>

            {!connectError && !isConnected && (
              <div className="status-card">
                <p>{isConnecting ? "Processing authentication…" : "Waiting for authentication…"}</p>
              </div>
            )}

            {isConnected && (
              <div className="status-card">
                <p>Connected! Redirecting…</p>
              </div>
            )}

            {connectError && (
              <div className="status-card">
                <p className="error-text">Authentication error: {connectError.message}</p>
                <button onClick={() => navigate("/")} className="primary" style={{ marginTop: "12px" }}>
                  Back to Main App
                </button>
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
