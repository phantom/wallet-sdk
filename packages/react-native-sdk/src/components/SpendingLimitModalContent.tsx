import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text, useTheme } from "@phantom/wallet-sdk-ui";
import { usePhantom } from "../PhantomContext";
import { useConnect } from "../hooks/useConnect";
import { useDisconnect } from "../hooks/useDisconnect";

export interface SpendingLimitModalContentProps {
  onClose: () => void;
}

export function SpendingLimitModalContent({ onClose }: SpendingLimitModalContentProps) {
  const theme = useTheme();
  const { user } = usePhantom();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutAndLogin = async () => {
    const authProvider = user?.authProvider;
    if (!authProvider) {
      console.error("No auth provider found in user session");
      return;
    }

    setIsLoggingOut(true);
    try {
      // Disconnect first
      await disconnect();
      // Then connect again with the same provider
      await connect({ provider: authProvider });
      // Close the modal after successful reconnection
      onClose();
    } catch (error) {
      console.error("Error during logout and login:", error);
      // Keep modal open on error so user can try again
    } finally {
      setIsLoggingOut(false);
    }
  };

  const styles = StyleSheet.create({
    buttons: {
      flexDirection: "row",
      gap: 8,
      width: "100%",
    },
    container: {
      flexDirection: "column",
      gap: 16,
      padding: 32,
    },
  });

  return (
    <View style={styles.container}>
      <Text variant="captionBold" color={theme.text}>
        Spending Limit Reached
      </Text>
      <Text variant="caption" color={theme.secondary}>
        You&apos;ve reached your spending limit with this app. To change your spending limit, please logout and login
        again. You can update your spending limit on the authorization screen.
      </Text>
      <View style={styles.buttons}>
        <Button fullWidth onClick={onClose} variant="primary">
          <Text variant="captionBold">Cancel</Text>
        </Button>
        <Button fullWidth onClick={handleLogoutAndLogin} disabled={isLoggingOut || !user?.authProvider}>
          <Text variant="captionBold">{isLoggingOut ? "Logging out..." : "Change Limit"}</Text>
        </Button>
      </View>
    </View>
  );
}
