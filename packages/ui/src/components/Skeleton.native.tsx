import { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";
import { useTheme } from "../hooks/useTheme";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 20, borderRadius, style }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  const skeletonStyle: ViewStyle = {
    width,
    height: typeof height === "number" ? height : parseInt(height as string),
    borderRadius: borderRadius ?? parseInt(theme.borderRadius),
    backgroundColor: theme.aux,
    ...style,
  };

  return <Animated.View style={[skeletonStyle, { opacity }]} />;
}
