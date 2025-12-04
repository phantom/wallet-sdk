import { type CSSProperties } from "react";
import { useTheme } from "../hooks/useTheme";
import { Icon } from "./Icon";
import { Text } from "./Text";
import type { ModalHeaderProps } from "./ModalHeader";

export function ModalHeader({ goBack = false, onGoBack, title, onClose, hideCloseButton = false }: ModalHeaderProps) {
  const theme = useTheme();

  const headerStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "28px 32px 0 32px",
    height: "32px",
  };

  const titleStyle: CSSProperties = {
    fontFeatureSettings: '"liga" off, "clig" off',
  };

  const backButtonStyle: CSSProperties = {
    position: "absolute" as const,
    left: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: "8px",
    background: "none",
    border: "none",
    width: "32px",
    height: "32px",
  };

  const closeButtonStyle: CSSProperties = {
    position: "absolute" as const,
    right: "32px",
    background: "none",
    border: "none",
    color: theme.secondary,
    fontSize: "24px",
    cursor: "pointer",
    padding: "4px 8px",
    lineHeight: 1,
    transition: "color 0.2s",
    width: "auto",
  };

  return (
    <div style={headerStyle}>
      {goBack && onGoBack && (
        <button style={backButtonStyle} onClick={onGoBack}>
          <Icon type="chevron-right" size={16} color={theme.secondary} style={{ transform: "rotate(180deg)" }} />
        </button>
      )}
      <div style={titleStyle}>
        <Text variant="caption" color={theme.secondary}>
          {title}
        </Text>
      </div>
      {onClose && !hideCloseButton && (
        <button style={closeButtonStyle} onClick={onClose}>
          <Icon type="x" size={16} color={theme.secondary} />
        </button>
      )}
    </div>
  );
}
