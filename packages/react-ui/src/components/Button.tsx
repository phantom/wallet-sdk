import React, { useState, useMemo, type CSSProperties, type ReactNode } from "react";
import { hexToRgba } from "../utils";
import { useTheme } from "../hooks/useTheme";

interface BaseButtonStyleOptions {
  fullWidth: boolean;
  disabled: boolean;
  fontSize?: CSSProperties["fontSize"];
  fontWeight?: CSSProperties["fontWeight"];
  justifyContent?: CSSProperties["justifyContent"];
}

// Custom hook for base button styles
const useBaseButtonStyle = ({
  fullWidth,
  disabled,
  fontSize,
  fontWeight,
  justifyContent = "center",
}: BaseButtonStyleOptions): CSSProperties => {
  const theme = useTheme();

  return {
    width: fullWidth ? "100%" : "auto",
    padding: "12px 16px",
    border: "none",
    borderRadius: theme.borderRadius,
    fontFamily: theme.typography.captionBold.fontFamily,
    fontSize: fontSize ?? theme.typography.captionBold.fontSize,
    fontStyle: theme.typography.captionBold.fontStyle,
    fontWeight: fontWeight ?? theme.typography.captionBold.fontWeight,
    lineHeight: theme.typography.captionBold.lineHeight,
    letterSpacing: theme.typography.captionBold.letterSpacing,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent,
    gap: "8px",
    opacity: disabled ? 0.6 : 1,
  };
};

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
  const [isHovering, setIsHovering] = useState(false);
  const isInteractive = !disabled && !isLoading;

  const baseStyle = useBaseButtonStyle({
    fullWidth,
    disabled: disabled || isLoading,
    justifyContent: variant === "primary" ? "center" : "space-between",
  });

  const backgroundColor = useMemo(() => {
    if (!isInteractive) {
      return variant === "primary" ? theme.aux : "transparent";
    }

    if (isHovering) {
      return variant === "primary" ? hexToRgba(theme.secondary, 0.15) : hexToRgba(theme.secondary, 0.1);
    }

    return variant === "primary" ? theme.aux : "transparent";
  }, [isInteractive, isHovering, variant, theme.aux, theme.secondary]);

  const buttonStyle: CSSProperties = {
    ...baseStyle,
    backgroundColor,
    color: theme.text,
    border: variant === "secondary" ? `1px solid ${theme.secondary}` : "none",
  };

  const handleMouseEnter = () => {
    if (isInteractive) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
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
  const [isHovering, setIsHovering] = useState(false);
  const isInteractive = !disabled && !isLoading;

  const baseStyle = useBaseButtonStyle({
    fullWidth,
    disabled: disabled || isLoading,
  });

  const backgroundColor = useMemo(() => {
    if (!isInteractive) {
      return theme.brand;
    }

    if (isHovering) {
      return hexToRgba(theme.brand, 0.85);
    }

    return theme.brand;
  }, [isInteractive, isHovering, theme.brand]);

  const buttonStyle: CSSProperties = {
    ...baseStyle,
    backgroundColor,
    color: "#FFFFFF",
  };

  const handleMouseEnter = () => {
    if (isInteractive) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
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
