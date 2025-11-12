import { useState, type CSSProperties } from "react";
import { useTheme } from "../hooks/useTheme";
import { usePhantom } from "../PhantomContext";
import { isMobileDevice } from "@phantom/browser-sdk";
import { ConnectModalContent } from "./ConnectModalContent";
import { ConnectedModalContent } from "./ConnectedModalContent";

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
    borderRadius: "16px",
    padding: "24px",
    maxWidth: isMobile ? "100%" : "350px",
    width: "100%",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    position: "relative" as const,
  };

  const headerStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "24px",
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    ...theme.typography.caption,
    color: theme.secondary,
    fontFeatureSettings: '"liga" off, "clig" off',
    textAlign: "center" as const,
  };

  const closeButtonStyle: CSSProperties = {
    position: "absolute" as const,
    right: 0,
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

  const footerStyle: CSSProperties = {
    marginTop: "24px",
    textAlign: "center" as const,
    ...theme.typography.label,
    color: theme.secondary,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h3 style={titleStyle}>{isConnected ? "Wallet" : "Login or Sign Up"}</h3>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={() => setIsCloseButtonHovering(true)}
            onMouseLeave={() => setIsCloseButtonHovering(false)}
          >
            ×
          </button>
        </div>

        {/* Body - Conditionally render based on connection state */}
        {isConnected ? (
          <ConnectedModalContent onClose={onClose} />
        ) : (
          <ConnectModalContent appIcon={appIcon} appName={appName} onClose={onClose} />
        )}

        {/* Footer */}
        <div style={footerStyle}>Protected by Phantom</div>
      </div>
    </div>
  );
}
