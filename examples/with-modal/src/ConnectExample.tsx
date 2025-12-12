import { useState } from "react";
import { ConnectButton, usePhantom, isMobileDevice, AddressType, useTheme, ConnectBox } from "@phantom/react-sdk";

interface ConnectExampleProps {
  appIcon?: string;
  appName?: string;
}

export default function ConnectExample({ appIcon, appName }: ConnectExampleProps) {
  const { isConnected } = usePhantom();
  const theme = useTheme();
  const isMobile = isMobileDevice();
  const [activeTab, setActiveTab] = useState<"connectbox" | "buttons">("connectbox");

  // On mobile, don't render anything here - button is fixed at bottom in App
  if (isMobile) {
    return null;
  }

  // Desktop view - show full content
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0",
        boxSizing: "border-box",
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
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
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
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", width: "100%" }}>
              <ConnectButton fullWidth={false} />
              <ConnectButton addressType={AddressType.solana} fullWidth={false} />
              <ConnectButton addressType={AddressType.ethereum} fullWidth={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
