import { useState, useEffect, type CSSProperties } from "react";
import { Button, Text, useTheme, ModalHeader } from "@phantom/wallet-sdk-ui";
import { usePhantom } from "../PhantomContext";
import { useDisconnect } from "../hooks/useDisconnect";

export interface ConnectedModalContentProps {
  onClose: () => void;
  hideCloseButton?: boolean;
}

export function ConnectedModalContent({ onClose, hideCloseButton = false }: ConnectedModalContentProps) {
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
    gap: "16px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box" as const,
  };

  const accountItemStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box" as const,
  };

  const addressTextStyle: CSSProperties = {
    fontFamily: "monospace",
    wordBreak: "break-all" as const,
    overflowWrap: "break-word" as const,
    minWidth: 0,
  };

  const errorContainerStyle: CSSProperties = {
    padding: "12px",
    backgroundColor: "rgba(220, 53, 69, 0.1)",
    borderRadius: theme.borderRadius,
    border: "1px solid rgba(220, 53, 69, 0.3)",
    width: "100%",
    boxSizing: "border-box" as const,
    minWidth: 0,
  };
  const contentWrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  };

  const accountListContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "0 32px 24px 32px",
    boxSizing: "border-box" as const,
    width: "100%",
    minWidth: 0,
  };

  const disconnectButtonContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "0 32px 24px 32px",
    boxSizing: "border-box" as const,
    width: "100%",
    minWidth: 0,
  };

  return (
    <div style={contentWrapperStyle}>
      <ModalHeader title="Wallet" onClose={onClose} hideCloseButton={hideCloseButton} />

      <div style={accountListContainerStyle}>
        {disconnectError && (
          <div style={errorContainerStyle}>
            <Text variant="caption" color={theme.error}>
              Failed to disconnect
            </Text>
          </div>
        )}

        {addresses && addresses.length > 0 && (
          <div style={accountListStyle}>
            {addresses.map((account, index) => (
              <div key={index} style={accountItemStyle}>
                <Text variant="label" color={theme.secondary} style={{ textTransform: "uppercase" }}>
                  {account.addressType}
                </Text>
                <div style={addressTextStyle}>
                  <Text variant="caption">{account.address}</Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={disconnectButtonContainerStyle}>
        <Button onClick={handleDisconnect} disabled={isDisconnecting} isLoading={isDisconnecting} fullWidth>
          <Text variant="captionBold">{isDisconnecting ? "Disconnecting..." : "Disconnect"}</Text>
        </Button>
      </div>
    </div>
  );
}
