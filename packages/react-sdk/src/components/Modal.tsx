import { useState, type CSSProperties } from "react";
import { useTheme } from "../hooks/useTheme";
import { usePhantom } from "../PhantomContext";
import { isMobileDevice } from "@phantom/browser-sdk";
import { ConnectModalContent } from "./ConnectModalContent";
import { ConnectedModalContent } from "./ConnectedModalContent";
import { Icon } from "./Icon";
import { Text } from "./Text";

export interface ModalProps {
  appIcon?: string;
  appName?: string;
  isVisible: boolean;
  onClose: () => void;
}

export function Modal({ appIcon, appName, isVisible, onClose }: ModalProps) {
  const theme = useTheme();
  const { isConnected } = usePhantom();
  const [isCloseButtonHovering, setIsCloseButtonHovering] = useState(false);
  const isMobile = isMobileDevice();

  if (!isVisible) return null;

  // Styles
  const overlayStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlay,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: isMobile ? "16px" : "0",
  };

  const modalStyle: CSSProperties = {
    backgroundColor: theme.background,
    borderRadius: theme.borderRadius,
    maxWidth: isMobile ? "100%" : "350px",
    width: "100%",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    position: "relative" as const,
    overflow: "hidden",
  };

  const headerStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "28px 32px 0 32px",
  };

  const titleStyle: CSSProperties = {
    marginBottom: "24px",
    fontFeatureSettings: '"liga" off, "clig" off',
  };

  const closeButtonStyle: CSSProperties = {
    position: "absolute" as const,
    right: "32px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: isCloseButtonHovering ? theme.secondary : theme.text,
    fontSize: "24px",
    cursor: "pointer",
    padding: "4px 8px",
    lineHeight: 1,
    transition: "color 0.2s",
  };

  const contentWrapperStyle: CSSProperties = {
    padding: "0 32px 24px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
  };

  const footerStyle: CSSProperties = {
    display: "flex",
    padding: "16px",
    justifyContent: "center",
    alignItems: "center",
    gap: "4px",
    borderTop: "1px solid rgba(152, 151, 156, 0.10)",
    ...theme.typography.caption,
    color: theme.secondary,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <Text variant="caption" color={theme.secondary}>
              {isConnected ? "Wallet" : "Login or Sign Up"}
            </Text>
          </div>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={() => setIsCloseButtonHovering(true)}
            onMouseLeave={() => setIsCloseButtonHovering(false)}
          >
            ×
          </button>
        </div>

        <div style={contentWrapperStyle}>
          {isConnected ? (
            <ConnectedModalContent onClose={onClose} />
          ) : (
            <ConnectModalContent appIcon={appIcon} appName={appName} onClose={onClose} />
          )}
        </div>

        <div style={footerStyle}>
          <Text variant="label" color={theme.secondary}>
            Powered by
          </Text>
          <Icon type="phantom" size={16} />
          <Text variant="label" color={theme.secondary}>
            Phantom
          </Text>
        </div>
      </div>
    </div>
  );
}
