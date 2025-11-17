import { useState } from "react";
import { ConnectButton, useAccounts, usePhantom, isMobileDevice, AddressType, useTheme } from "@phantom/react-sdk";

export default function ConnectExample() {
  const accounts = useAccounts();
  const { isConnected } = usePhantom();
  const theme = useTheme();

  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const isMobile = isMobileDevice();

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        padding: "2rem",
        background: theme.background,
        borderRadius: "16px",
        border: `1px solid ${theme.secondary}`,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease",
      }}
    >
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          color: theme.text,
          marginBottom: "1.5rem",
          textAlign: "center",
          transition: "color 0.3s ease",
        }}
      >
        Connection Test
      </h2>

      {/* Device Info Toggle */}
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <button
          onClick={() => setShowDeviceInfo(!showDeviceInfo)}
          style={{
            background: "transparent",
            border: `1px solid ${theme.secondary}`,
            color: theme.secondary,
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          {showDeviceInfo ? "Hide" : "Show"} Device Info
        </button>

        {showDeviceInfo && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: theme.aux,
              borderRadius: "8px",
              fontSize: "0.875rem",
              color: theme.secondary,
              transition: "all 0.3s ease",
            }}
          >
            <p>
              <strong>Device Type:</strong> {isMobile ? "Mobile" : "Desktop"}
            </p>
            <p>
              <strong>User Agent:</strong> {navigator.userAgent}
            </p>
            <p>
              <strong>Screen Size:</strong> {window.screen.width} x {window.screen.height}
            </p>
            <p>
              <strong>Touch Support:</strong> {"ontouchstart" in window ? "Yes" : "No"}
            </p>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div
        style={{
          padding: "1rem",
          background: isConnected ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${isConnected ? "#bbf7d0" : "#fecaca"}`,
          borderRadius: "8px",
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.5rem 0",
            color: isConnected ? "#16a34a" : "#dc2626",
            fontSize: "1rem",
          }}
        >
          Status: {isConnected ? "Connected" : "Disconnected"}
        </h3>
      </div>

      {/* Primary Connect Button */}
      <div style={{ marginBottom: "2rem" }}>
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: "500",
            color: theme.text,
            marginBottom: "0.5rem",
            transition: "color 0.3s ease",
          }}
        >
          Main Connection:
        </h3>
        <p
          style={{
            fontSize: "0.875rem",
            color: theme.secondary,
            marginBottom: "1rem",
            transition: "color 0.3s ease",
          }}
        >
          Click the button to connect. Once connected, it displays your wallet address.
        </p>
        <ConnectButton fullWidth />
      </div>

      {/* ConnectButton Component Variations */}
      <div style={{ marginBottom: "2rem" }}>
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: "500",
            color: theme.text,
            marginBottom: "0.5rem",
            transition: "color 0.3s ease",
          }}
        >
          Address-Specific Buttons:
        </h3>
        <p
          style={{
            fontSize: "0.875rem",
            color: theme.secondary,
            marginBottom: "1rem",
            transition: "color 0.3s ease",
          }}
        >
          These buttons show specific address types when connected.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <ConnectButton fullWidth={false} />
          <ConnectButton addressType={AddressType.solana} fullWidth={false} />
          <ConnectButton addressType={AddressType.ethereum} fullWidth={false} />
        </div>
      </div>

      {/* Connected Accounts */}
      {isConnected && accounts && accounts.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "500",
              color: theme.text,
              marginBottom: "1rem",
              transition: "color 0.3s ease",
            }}
          >
            Connected Accounts:
          </h3>

          {accounts.map((account, index) => (
            <div
              key={index}
              style={{
                padding: "1rem",
                background: theme.aux,
                border: `1px solid ${theme.secondary}`,
                borderRadius: "8px",
                marginBottom: "0.5rem",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    background: account.addressType === "solana" ? "#8b5cf6" : "#3b82f6",
                    color: "white",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                    textTransform: "uppercase",
                  }}
                >
                  {account.addressType}
                </span>
              </div>

              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  color: theme.secondary,
                  wordBreak: "break-all",
                  background: theme.background,
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: `1px solid ${theme.secondary}`,
                  transition: "all 0.3s ease",
                }}
              >
                {account.address}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Notice */}
      {isMobile && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: theme.aux,
            border: `1px solid ${theme.secondary}`,
            borderRadius: "8px",
            fontSize: "0.875rem",
            color: theme.text,
          }}
        >
          <strong>📱 Mobile Device Detected:</strong>
          <br />
          When you click "Connect Wallet", you'll see an additional "Open in Phantom App" button that will redirect to
          the Phantom mobile app.
        </div>
      )}
    </div>
  );
}
