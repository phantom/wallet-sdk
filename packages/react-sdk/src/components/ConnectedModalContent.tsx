import { useState, type CSSProperties } from "react";
import { Button } from "./Button";
import { useTheme } from "../hooks/useTheme";
import { usePhantom } from "../PhantomProvider";
import { useDisconnect } from "../hooks/useDisconnect";

export interface ConnectedModalContentProps {
  onClose: () => void;
}

export function ConnectedModalContent({ onClose }: ConnectedModalContentProps) {
  const theme = useTheme();
  const { addresses } = usePhantom();
  const { disconnect } = useDisconnect();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnect();
      onClose();
    } catch (err) {
      console.error("Error disconnecting:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const accountListStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    marginBottom: "24px",
  };

  const accountCardStyle: CSSProperties = {
    padding: "16px",
    background: theme.aux,
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.secondary}`,
  };

  const addressTypeLabelStyle: CSSProperties = {
    ...theme.typography.label,
    color: theme.secondary,
    textTransform: "uppercase" as const,
    marginBottom: "8px",
    display: "block",
  };

  const addressTextStyle: CSSProperties = {
    ...theme.typography.caption,
    color: theme.text,
    fontFamily: "monospace",
    wordBreak: "break-all" as const,
  };

  return (
    <>
      {/* Connected Accounts */}
      {addresses && addresses.length > 0 && (
        <div style={accountListStyle}>
          {addresses.map((account, index) => (
            <div key={index} style={accountCardStyle}>
              <span style={addressTypeLabelStyle}>{account.addressType}</span>
              <div style={addressTextStyle}>{account.address}</div>
            </div>
          ))}
        </div>
      )}

      {/* Disconnect Button */}
      <Button onClick={handleDisconnect} disabled={isDisconnecting} isLoading={isDisconnecting} fullWidth={true}>
        {isDisconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>
    </>
  );
}
