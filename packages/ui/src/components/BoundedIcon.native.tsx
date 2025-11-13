import { View, type ViewStyle } from "react-native";
import { Icon, type IconType } from "./Icon";
import { useTheme } from "../hooks/useTheme";

export interface BoundedIconProps {
  type: IconType;
  size?: number;
  color?: string;
  style?: ViewStyle;
  background?: string;
}

export function BoundedIcon({ type, size = 20, color, style, background }: BoundedIconProps) {
  const theme = useTheme();

  const iconBackgroundStyle: ViewStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: background ?? theme.aux,
    ...style,
  };

  return (
    <View style={iconBackgroundStyle}>
      <Icon type={type} size={size} color={color} />
    </View>
  );
}
