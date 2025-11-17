import type { CSSProperties } from "react";
import { Icon, type IconType } from "./Icon";
import { useTheme } from "../hooks/useTheme";

export interface BoundedIconProps {
  type: IconType;
  size?: number;
  color?: string;
  style?: CSSProperties;
  background?: string;
}

export function BoundedIcon({ type, size = 20, color, style, background }: BoundedIconProps) {
  const theme = useTheme();

  const iconBackgroundStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: background ?? theme.aux,
  };

  return (
    <div style={{ ...iconBackgroundStyle, ...style }}>
      <Icon type={type} size={size} color={color} />
    </div>
  );
}
