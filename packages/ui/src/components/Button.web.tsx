import { useState, useMemo, type CSSProperties, type ReactNode } from "react";
import { hexToRgba } from "../utils";
import { useTheme } from "../hooks/useTheme";
import { Icon } from "./Icon";
import { Text } from "./Text";

interface BaseButtonStyleOptions {
  fullWidth: boolean;
  disabled: boolean;
  fontSize?: CSSProperties["fontSize"];
  fontWeight?: CSSProperties["fontWeight"];
}

// Custom hook for base button styles
const useBaseButtonStyle = ({ fullWidth, disabled, fontSize, fontWeight }: BaseButtonStyleOptions): CSSProperties => {
  const theme = useTheme();

  return {
    height: "56px",
    padding: "12px 16px",
    width: fullWidth ? "100%" : "auto",
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
    gap: "8px",
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
  centered?: boolean;
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
  testId?: string;
}

export function LoginWithPhantomButton({
  children = "Continue with Phantom",
  onClick,
  disabled = false,
  fullWidth = true,
  isLoading = false,
  testId = "login-with-phantom-button",
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

  const buttonContentStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    width: "100%",
  };

  const buttonLeftStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const buttonRightStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  return (
    <button
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled || isLoading}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={testId}
    >
      <span style={buttonContentStyle}>
        <span style={buttonLeftStyle}>
          <Icon type="phantom" size={20} />
          <Text variant="captionBold" color="#FFFFFF">
            {isLoading ? "Connecting..." : children}
          </Text>
        </span>
        <span style={buttonRightStyle}>
          <Icon type="chevron-right" size={16} color="#FFFFFF" />
        </span>
      </span>
    </button>
  );
}
