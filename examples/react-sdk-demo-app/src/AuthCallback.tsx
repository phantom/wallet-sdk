import { useNavigate } from "react-router-dom";
import { ConnectBox, usePhantom } from "@phantom/react-sdk";
import { DebugConsole } from "./components/DebugConsole";
import "./AuthCallback.css";

export function AuthCallback() {
  const navigate = useNavigate();
  const { isConnected } = usePhantom();

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div id="app">
      <h1>Phantom Authentication</h1>

      <div className="main-layout">
        <div className="left-panel">
          <div className="section">
            <ConnectBox />
            {isConnected && (
              <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
                <button onClick={handleGoHome} className="primary">
                  Go to Main App
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
