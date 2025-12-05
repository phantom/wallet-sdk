import { useState } from "react";
import {
  ConnectButton,
  useAccounts,
  usePhantom,
  isMobileDevice,
  AddressType,
  useTheme,
  ConnectBox,
} from "@phantom/react-sdk";

interface ConnectExampleProps {
  appIcon?: string;
  appName?: string;
}

export default function ConnectExample({ appIcon, appName }: ConnectExampleProps) {
  const accounts = useAccounts();
  const { isConnected } = usePhantom();
  const theme = useTheme();
  const isMobile = isMobileDevice();
  const [activeTab, setActiveTab] = useState<"connectbox" | "buttons">("connectbox");

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Top Bar: Status and Tabs */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "100px",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={() => setActiveTab("connectbox")}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === "connectbox" ? `2px solid ${theme.brand || theme.text}` : "2px solid transparent",
              color: activeTab === "connectbox" ? theme.text : theme.secondary,
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: activeTab === "connectbox" ? "600" : "400",
              transition: "all 0.2s ease",
            }}
          >
            Connect Box
          </button>
          <button
            onClick={() => setActiveTab("buttons")}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === "buttons" ? `2px solid ${theme.brand || theme.text}` : "2px solid transparent",
              color: activeTab === "buttons" ? theme.text : theme.secondary,
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: activeTab === "buttons" ? "600" : "400",
              transition: "all 0.2s ease",
            }}
          >
            Connect Buttons
          </button>
        </div>

        {/* Connection Status - Small and less prominent */}
        <span
          style={{
            fontSize: "0.75rem",
            color: isConnected ? "#16a34a" : "#dc2626",
            fontWeight: "500",
          }}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Tab Content */}
      {activeTab === "connectbox" && (
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <ConnectBox appIcon={appIcon} appName={appName} />
        </div>
      )}

      {activeTab === "buttons" && (
        <div style={{ width: "100%" }}>
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
        </div>
      )}

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
