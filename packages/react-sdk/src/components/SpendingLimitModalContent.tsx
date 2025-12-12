import { Text, Button, useTheme } from "@phantom/wallet-sdk-ui";

export interface SpendingLimitModalContentProps {
  onClose: () => void;
}

export function SpendingLimitModalContent({ onClose }: SpendingLimitModalContentProps) {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 32 }}>
      <Text variant="caption" color={theme.secondary}>
        You&apos;ve reached the maximum daily limit allowed to spend by this application.
      </Text>
      <Button fullWidth onClick={onClose}>
        <Text variant="captionBold">Close</Text>
      </Button>
    </div>
  );
}
