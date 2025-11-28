import { Text, Button, useTheme } from "@phantom/wallet-sdk-ui";

export interface SpendingLimitModalContentProps {
  onClose: () => void;
}

export function SpendingLimitModalContent({ onClose }: SpendingLimitModalContentProps) {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <Text variant="captionBold" color={theme.text}>
        Would you like to increase your limit?
      </Text>
      <Text variant="caption" color={theme.secondary}>
        You've reached your spending limit with this app
      </Text>
      <div style={{ display: "flex", flexDirection: "row", gap: 8, width: "100%" }}>
        <Button fullWidth onClick={onClose}>
          <Text variant="captionBold">Close</Text>
        </Button>
        <Button fullWidth onClick={onClose}>
          <Text variant="captionBold">Continue</Text>
        </Button>
      </div>
    </div>
  );
}
