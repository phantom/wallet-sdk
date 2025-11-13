import { type CSSProperties } from "react";
import { useTheme } from "../hooks/useTheme";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
}

export function Skeleton({ width = "100%", height = "20px", borderRadius, style }: SkeletonProps) {
  const theme = useTheme();

  const skeletonStyle: CSSProperties = {
    width,
    height,
    borderRadius: borderRadius ?? theme.borderRadius,
    backgroundColor: theme.aux,
    animation: "pulse 1.5s ease-in-out infinite",
    ...style,
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
      <div style={skeletonStyle} />
    </>
  );
}
