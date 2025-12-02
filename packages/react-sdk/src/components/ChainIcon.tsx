import { BoundedIcon, useTheme } from "@phantom/wallet-sdk-ui";
import type { AddressType } from "@phantom/browser-sdk";
import type { CSSProperties } from "react";

interface ChainIconProps {
  addressType: AddressType;
  size?: number;
  style?: CSSProperties;
}

export function ChainIcon({ addressType, size = 8, style }: ChainIconProps) {
  const theme = useTheme();
  const type = addressType.toLowerCase();

  if (type.includes("solana")) {
    return <BoundedIcon type="solana" size={size} background={theme.aux} color={theme.text} style={style} />;
  }

  if (type.includes("ethereum") || type.includes("evm")) {
    return <BoundedIcon type="ethereum" size={size} background={theme.aux} color={theme.text} style={style} />;
  }

  if (type.includes("bitcoin")) {
    return <BoundedIcon type="bitcoin" size={size} background={theme.aux} color={theme.text} style={style} />;
  }

  if (type.includes("sui")) {
    return <BoundedIcon type="sui" size={size} background={theme.aux} color={theme.text} style={style} />;
  }

  // Fallback to first letter as text
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size * 2}px`,
        height: `${size * 2}px`,
        borderRadius: "4px",
        backgroundColor: theme.aux,
        color: theme.text,
        fontSize: "6px",
        fontWeight: "bold",
        lineHeight: "1",
        ...style,
      }}
      title={addressType}
    >
      {addressType.charAt(0).toUpperCase()}
    </span>
  );
}
