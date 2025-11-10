import React, { type CSSProperties, type ReactNode } from "react";
import { hexToRgba } from "../utils";
import type { PhantomThemeWithAux } from "../themes";

const PHANTOM_BRAND_COLOR = "#7C63E7";

export interface LoginWithPhantomButtonProps {
  children?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  theme: PhantomThemeWithAux;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export function LoginWithPhantomButton({
  children = "Login with Phantom",
  onClick,
  disabled = false,
  theme,
  fullWidth = true,
  isLoading = false,
}: LoginWithPhantomButtonProps) {
  const buttonStyle: CSSProperties = {
    width: fullWidth ? "100%" : "auto",
    padding: "12px 16px",
    backgroundColor: PHANTOM_BRAND_COLOR,
    color: "#FFFFFF",
    border: "none",
    borderRadius: theme.borderRadius,
    fontSize: "16px",
    fontWeight: "600",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    opacity: disabled ? 0.6 : 1,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      e.currentTarget.style.backgroundColor = hexToRgba(PHANTOM_BRAND_COLOR, 0.85);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = PHANTOM_BRAND_COLOR;
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
