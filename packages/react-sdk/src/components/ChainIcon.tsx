import { Icon, useTheme } from "@phantom/wallet-sdk-ui";
import type { AddressType } from "@phantom/browser-sdk";

interface ChainIconProps {
  addressType: AddressType;
  size?: number;
}

const IconWrapper = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px",
        backgroundColor: theme.aux,
        color: theme.text,
        padding: "2px",
      }}
    >
      {children}
    </span>
  );
};

export function ChainIcon({ addressType, size = 8 }: ChainIconProps) {
  const theme = useTheme();
  const type = addressType.toLowerCase();

  if (type.includes("solana")) {
    return (
      <IconWrapper>
        <Icon type="solana" size={size} color={theme.text} />
      </IconWrapper>
    );
  }

  if (type.includes("ethereum") || type.includes("evm")) {
    return (
      <IconWrapper>
        <Icon type="ethereum" size={size} color={theme.text} />
      </IconWrapper>
    );
  }

  if (type.includes("bitcoin")) {
    return (
      <IconWrapper>
        <Icon type="bitcoin" size={size} color={theme.text} />
      </IconWrapper>
    );
  }

  if (type.includes("sui")) {
    return (
      <IconWrapper>
        <Icon type="sui" size={size} color={theme.text} />
      </IconWrapper>
    );
  }

  // Fallback to first letter as text
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px",
        backgroundColor: theme.aux,
        color: theme.text,
        fontSize: "6px",
        fontWeight: "bold",
        lineHeight: "1",
        padding: "2px",
      }}
      title={addressType}
    >
      {addressType.charAt(0).toUpperCase()}
    </span>
  );
}
