import { type CSSProperties, type ReactNode } from "react";
import { useTheme } from "../hooks/useTheme";

export interface ModalProps {
  appIcon?: string;
  appName?: string;
  isVisible: boolean;
  onClose: () => void;
  isMobile?: boolean;
  children: ReactNode;
}

export function Modal({
  appIcon: _appIcon,
  appName: _appName,
  isVisible,
  onClose,
  isMobile = false,
  children,
}: ModalProps) {
  const theme = useTheme();

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

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
