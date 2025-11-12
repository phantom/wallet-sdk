import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "../hooks/useTheme";

export type TextVariant = "caption" | "captionBold" | "label";

export interface TextProps {
  children: ReactNode;
  variant?: TextVariant;
  color?: string;
  style?: CSSProperties;
}

export function Text({ children, variant = "caption", color, style }: TextProps) {
  const theme = useTheme();

  const textStyle: CSSProperties = {
    ...theme.typography[variant],
    color: color ?? theme.text,
    margin: 0,
    ...style,
  };

  return <span style={textStyle}>{children}</span>;
}
