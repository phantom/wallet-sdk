import { View, StyleSheet } from "react-native";
import { Button, Text, useTheme } from "@phantom/wallet-sdk-ui";

export interface SpendingLimitModalContentProps {
  onClose: () => void;
}

export function SpendingLimitModalContent({ onClose }: SpendingLimitModalContentProps) {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: "column",
      gap: 16,
      padding: 32,
    },
  });

  return (
    <View style={styles.container}>
      <Text variant="caption" color={theme.secondary}>
        You&apos;ve reached the maximum daily limit allowed to spend by this application.
      </Text>
      <Button fullWidth onClick={onClose}>
        <Text variant="captionBold">Close</Text>
      </Button>
    </View>
  );
}
