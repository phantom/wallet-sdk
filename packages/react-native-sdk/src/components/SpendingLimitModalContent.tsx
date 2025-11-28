import { View, StyleSheet } from "react-native";
import { Button, Text, useTheme } from "@phantom/wallet-sdk-ui";

export interface SpendingLimitModalContentProps {
  onClose: () => void;
}

export function SpendingLimitModalContent({ onClose }: SpendingLimitModalContentProps) {
  const theme = useTheme();

  const styles = StyleSheet.create({
    buttons: {
      flexDirection: "row",
      gap: 8,
      width: "100%",
    },
    container: {
      flexDirection: "column",
      gap: 16,
      width: "100%",
    },
  });

  return (
    <View style={styles.container}>
      <Text variant="captionBold" color={theme.text}>
        Would you like to increase your limit?
      </Text>
      <Text variant="caption" color={theme.secondary}>
        You’ve reached your spending limit with this app
      </Text>
      <View style={styles.buttons}>
        <Button fullWidth onClick={onClose}>
          <Text variant="captionBold">Close</Text>
        </Button>
        <Button fullWidth onClick={onClose}>
          <Text variant="captionBold">Continue</Text>
        </Button>
      </View>
    </View>
  );
}
