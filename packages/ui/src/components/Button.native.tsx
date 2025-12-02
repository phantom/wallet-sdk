import { useState, useMemo, type ReactNode } from "react";
import { TouchableOpacity, View, ActivityIndicator, type ViewStyle } from "react-native";
import { hexToRgba } from "../utils";
import { useTheme } from "../hooks/useTheme";
import { Icon } from "./Icon";
import { Text } from "./Text";

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
  centered = false,
}: ButtonProps) {
  const theme = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const isInteractive = !disabled && !isLoading;

  const backgroundColor = useMemo(() => {
    if (!isInteractive) {
      return variant === "primary" ? theme.aux : "transparent";
    }

    if (isPressed) {
      return variant === "primary" ? hexToRgba(theme.secondary, 0.15) : hexToRgba(theme.secondary, 0.1);
    }

    return variant === "primary" ? theme.aux : "transparent";
  }, [isInteractive, isPressed, variant, theme.aux, theme.secondary]);

  const buttonStyle: ViewStyle = {
    height: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: fullWidth ? "100%" : "auto",
    borderRadius: parseInt(theme.borderRadius),
    backgroundColor,
    borderWidth: variant === "secondary" ? 1 : 0,
    borderColor: variant === "secondary" ? theme.secondary : "transparent",
    opacity: disabled || isLoading ? 0.6 : 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: centered ? "center" : "flex-start",
    gap: 8,
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onClick}
      disabled={disabled || isLoading}
      onPressIn={() => isInteractive && setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={1}
    >
      {isLoading ? (
        <>
          <ActivityIndicator color={theme.text} size="small" />
          <Text variant="captionBold">Connecting...</Text>
        </>
      ) : (
        <>{children}</>
      )}
    </TouchableOpacity>
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
  children = "Continue with Phantom",
  onClick,
  disabled = false,
  fullWidth = true,
  isLoading = false,
}: LoginWithPhantomButtonProps) {
  const theme = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const isInteractive = !disabled && !isLoading;

  const backgroundColor = useMemo(() => {
    if (!isInteractive) {
      return theme.brand;
    }

    if (isPressed) {
      return hexToRgba(theme.brand, 0.85);
    }

    return theme.brand;
  }, [isInteractive, isPressed, theme.brand]);

  const buttonStyle: ViewStyle = {
    height: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: fullWidth ? "100%" : "auto",
    borderRadius: parseInt(theme.borderRadius),
    backgroundColor,
    opacity: disabled || isLoading ? 0.6 : 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onClick}
      disabled={disabled || isLoading}
      onPressIn={() => isInteractive && setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={1}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon type="phantom" size={20} color="#FFFFFF" />
        <Text variant="captionBold" color="#FFFFFF">
          {isLoading ? "Connecting..." : children}
        </Text>
      </View>
      <Icon type="chevron-right" size={16} color="#FFFFFF" />
    </TouchableOpacity>
  );
}
