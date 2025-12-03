import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text, useTheme, hexToRgba, ModalHeader } from "@phantom/wallet-sdk-ui";
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

  const errorBackgroundColor = hexToRgba(theme.error, 0.1); // 10% opacity
  const errorBorderColor = hexToRgba(theme.error, 0.3); // 30% opacity

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

  const styles = StyleSheet.create({
    accountItem: {
      flexDirection: "column",
      gap: 8,
      width: "100%",
    },
    accountList: {
      flexDirection: "column",
      gap: 16,
      width: "100%",
    },
    accountTypeText: {
      textTransform: "uppercase",
    },
    addressText: {
      fontFamily: "monospace",
    },
    container: {
      alignItems: "center",
      flexDirection: "column",
      gap: 24,
      paddingBottom: 24,
      paddingHorizontal: 32,
      width: "100%",
    },
    errorContainer: {
      backgroundColor: errorBackgroundColor,
      borderColor: errorBorderColor,
      borderRadius: theme.borderRadius,
      borderWidth: 1,
      padding: 12,
      width: "100%",
    },
  });

  return (
    <View style={styles.container}>
      <ModalHeader title="Wallet" onClose={onClose} />

      {addresses && addresses.length > 0 && (
        <View style={styles.accountList}>
          {addresses.map((account, index) => (
            <View key={index} style={styles.accountItem}>
              <Text variant="label" color={theme.secondary} style={styles.accountTypeText}>
                {account.addressType}
              </Text>
              <Text variant="caption" style={styles.addressText}>
                {account.address}
              </Text>
            </View>
          ))}
        </View>
      )}

      {disconnectError && (
        <View style={styles.errorContainer}>
          <Text variant="caption" color={theme.error}>
            Failed to disconnect
          </Text>
        </View>
      )}

      <Button onClick={handleDisconnect} disabled={isDisconnecting} isLoading={isDisconnecting} fullWidth>
        <Text variant="captionBold">{isDisconnecting ? "Disconnecting..." : "Disconnect"}</Text>
      </Button>
    </View>
  );
}
