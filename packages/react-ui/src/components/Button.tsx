import React, { type CSSProperties, type ReactNode } from "react";
import { hexToRgba } from "../utils";
import { useTheme } from "../hooks/useTheme";

// Shared base button styles
const getBaseButtonStyle = (
  fullWidth: boolean,
  disabled: boolean,
  borderRadius: string,
  fontSize: string = "16px",
  fontWeight: string = "600",
  justifyContent: "center" | "space-between" = "center",
): CSSProperties => ({
  width: fullWidth ? "100%" : "auto",
  padding: "12px 16px",
  border: "none",
  borderRadius,
  fontSize,
  fontWeight,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "background-color 0.2s",
  display: "flex",
  alignItems: "center",
  justifyContent,
  gap: "8px",
  opacity: disabled ? 0.6 : 1,
});

// Button component
export interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  isLoading?: boolean;
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  fullWidth = true,
  isLoading = false,
}: ButtonProps) {
  const theme = useTheme();
  const baseStyle = getBaseButtonStyle(
    fullWidth,
    disabled || isLoading,
    theme.borderRadius,
    variant === "primary" ? "16px" : "14px",
    variant === "primary" ? "600" : "500",
    variant === "primary" ? "center" : "space-between",
  );

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

// LoginWithPhantomButton component
export interface LoginWithPhantomButtonProps {
  children?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export function LoginWithPhantomButton({
  children = "Login with Phantom",
  onClick,
  disabled = false,
  fullWidth = true,
  isLoading = false,
}: LoginWithPhantomButtonProps) {
  const theme = useTheme();
  const buttonStyle: CSSProperties = {
    ...getBaseButtonStyle(fullWidth, disabled || isLoading, theme.borderRadius),
    backgroundColor: theme.brand,
    color: "#FFFFFF",
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      e.currentTarget.style.backgroundColor = hexToRgba(theme.brand, 0.85);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = theme.brand;
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
