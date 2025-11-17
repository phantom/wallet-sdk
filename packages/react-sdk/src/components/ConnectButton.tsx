import { useMemo, type CSSProperties } from "react";
import { usePhantom } from "../PhantomContext";
import { useModal } from "../hooks";
import { useTheme } from "@phantom/wallet-sdk-ui";
import type { AddressType } from "@phantom/browser-sdk";

export interface ConnectButtonProps {
  addressType?: AddressType;
  fullWidth?: boolean;
}

export function ConnectButton({ addressType, fullWidth = false }: ConnectButtonProps) {
  const theme = useTheme();
  const { open } = useModal();
  const { isConnected, addresses } = usePhantom();

  const displayAddress = useMemo(() => {
    if (!addresses || addresses.length === 0) return null;

    if (addressType) {
      return addresses.find(addr => addr.addressType === addressType);
    }

    return addresses[0];
  }, [addresses, addressType]);

  const truncatedAddress = useMemo(() => {
    if (!displayAddress) return "";
    const addr = displayAddress.address;
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, [displayAddress]);

  const buttonStyle: CSSProperties = {
    width: fullWidth ? "100%" : "auto",
    padding: "12px 16px",
    border: "none",
    borderRadius: theme.borderRadius,
    fontFamily: theme.typography.captionBold.fontFamily,
    fontSize: theme.typography.captionBold.fontSize,
    fontStyle: theme.typography.captionBold.fontStyle,
    fontWeight: theme.typography.captionBold.fontWeight,
    lineHeight: theme.typography.captionBold.lineHeight,
    letterSpacing: theme.typography.captionBold.letterSpacing,
    cursor: "pointer",
    transition: "background-color 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: theme.aux,
    color: theme.text,
  };

  const connectedButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: theme.aux,
    cursor: "pointer",
  };

  if (isConnected && displayAddress) {
    return (
      <button style={connectedButtonStyle} onClick={open}>
        <span style={{ fontFamily: "monospace" }}>{truncatedAddress}</span>
      </button>
    );
  }

  return (
    <button style={buttonStyle} onClick={open}>
      Connect Wallet
    </button>
  );
}
