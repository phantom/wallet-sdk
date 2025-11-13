import { Text as RNText, type TextStyle } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "../hooks/useTheme";

export type TextVariant = "caption" | "captionBold" | "label";

export interface TextProps {
  children: ReactNode;
  variant?: TextVariant;
  color?: string;
  style?: TextStyle;
}

export function Text({ children, variant = "caption", color, style }: TextProps) {
  const theme = useTheme();

  const textStyle: TextStyle = {
    ...theme.typography[variant],
    color: color ?? theme.text,
    ...style,
  };

  return <RNText style={textStyle}>{children}</RNText>;
}
