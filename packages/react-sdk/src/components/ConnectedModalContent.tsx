import { useState, useEffect, type CSSProperties } from "react";
import { Button } from "./Button";
import { useTheme } from "../hooks/useTheme";
import { usePhantom } from "../PhantomContext";
import { useDisconnect } from "../hooks/useDisconnect";

export interface ConnectedModalContentProps {
  onClose: () => void;
}

export function ConnectedModalContent({ onClose }: ConnectedModalContentProps) {
  const theme = useTheme();
  const { addresses } = usePhantom();
  const { disconnect } = useDisconnect();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<Error | null>(null);

  // Clear error state when component mounts (when modal opens)
  useEffect(() => {
    setDisconnectError(null);
  }, []);

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      setDisconnectError(null); // Clear previous error
      await disconnect();
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setDisconnectError(error);
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

  const errorContainerStyle: CSSProperties = {
    padding: "12px 16px",
    background: theme.aux,
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.error}`,
    marginBottom: "16px",
  };

  const errorTextStyle: CSSProperties = {
    ...theme.typography.caption,
    color: theme.error,
    margin: 0,
  };

  return (
    <>
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

      {disconnectError && (
        <div style={errorContainerStyle}>
          <p style={errorTextStyle}>Failed to disconnect</p>
        </div>
      )}

      <Button onClick={handleDisconnect} disabled={isDisconnecting} isLoading={isDisconnecting} fullWidth>
        {isDisconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>
    </>
  );
}
