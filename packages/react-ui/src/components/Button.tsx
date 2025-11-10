import React, { type CSSProperties, type ReactNode } from "react";
import { hexToRgba } from "../utils";
import type { PhantomThemeWithAux } from "../themes";

export interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  theme: PhantomThemeWithAux;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  theme,
  fullWidth = true,
  isLoading = false,
}: ButtonProps) {
  const baseStyle: CSSProperties = {
    width: fullWidth ? "100%" : "auto",
    padding: "12px 16px",
    border: "none",
    borderRadius: theme.borderRadius,
    fontSize: variant === "primary" ? "16px" : "14px",
    fontWeight: variant === "primary" ? "600" : "500",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: variant === "primary" ? "center" : "space-between",
    gap: "8px",
    opacity: disabled ? 0.6 : 1,
  };

  const primaryStyle: CSSProperties = {
    ...baseStyle,
    backgroundColor: theme.aux,
    color: theme.text,
  };

  const secondaryStyle: CSSProperties = {
    ...baseStyle,
    backgroundColor: "transparent",
    color: theme.text,
    border: `1px solid ${theme.secondary}`,
  };

  const buttonStyle = variant === "primary" ? primaryStyle : secondaryStyle;

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      if (variant === "primary") {
        e.currentTarget.style.backgroundColor = hexToRgba(theme.secondary, 0.15);
      } else {
        e.currentTarget.style.backgroundColor = hexToRgba(theme.secondary, 0.1);
      }
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === "primary") {
      e.currentTarget.style.backgroundColor = theme.aux;
    } else {
      e.currentTarget.style.backgroundColor = "transparent";
    }
  };

  return (
    <button
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled || isLoading}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isLoading ? "Connecting..." : children}
    </button>
  );
}
