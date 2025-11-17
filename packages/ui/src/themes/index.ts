import { hexToRgba } from "../utils/index";

// Type-safe hex color string
export type HexColor = `#${string}`;

export interface PhantomTheme {
  // Background color for modal
  background: HexColor;

  // Secondary color for text, borders, dividers (must be hex for opacity derivation)
  secondary: HexColor;

  // Error color
  error: HexColor;

  // Success color
  success: HexColor;

  // Primary text color
  text: HexColor;

  // Overlay background (with opacity) - can be rgba or hex
  overlay: string;

  // Border radius for buttons and modal
  borderRadius: string;

  // Brand color
  brand: HexColor;
}

// Web typography uses strings with units
export interface WebTypography {
  caption: {
    fontFamily: string;
    fontSize: string;
    fontStyle: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
  };
  captionBold: {
    fontFamily: string;
    fontSize: string;
    fontStyle: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
  };
  label: {
    fontFamily: string;
    fontSize: string;
    fontStyle: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
  };
}

// Native typography uses numbers (unitless)
export interface NativeTypography {
  caption: {
    fontFamily: string;
    fontSize: number;
    fontStyle: string;
    fontWeight: string;
    lineHeight: number;
    letterSpacing: number;
  };
  captionBold: {
    fontFamily: string;
    fontSize: number;
    fontStyle: string;
    fontWeight: string;
    lineHeight: number;
    letterSpacing: number;
  };
  label: {
    fontFamily: string;
    fontSize: number;
    fontStyle: string;
    fontWeight: string;
    lineHeight: number;
    letterSpacing: number;
  };
}

type ComputedPhantomWebTheme = PhantomTheme & {
  aux: string;
  typography: WebTypography;
};

type ComputedPhantomNativeTheme = PhantomTheme & {
  aux: string;
  typography: NativeTypography;
};

// Union type for compatibility
export type ComputedPhantomTheme = ComputedPhantomWebTheme | ComputedPhantomNativeTheme;

export const loginWithPhantomColor: HexColor = "#7C63E7";

export const darkTheme: PhantomTheme = {
  background: "#181818",
  text: "#FFFFFF",
  secondary: "#98979C",
  overlay: "rgba(0, 0, 0, 0.7)",
  borderRadius: "16px",
  error: "#F00000",
  success: "#1CC700",
  brand: loginWithPhantomColor,
};

export const lightTheme: PhantomTheme = {
  background: "#FFFFFF",
  text: "#181818",
  secondary: "#98979C",
  overlay: "rgba(0, 0, 0, 0.5)",
  borderRadius: "16px",
  error: "#F00000",
  success: "#1CC700",
  brand: loginWithPhantomColor,
};

export function mergeTheme(customTheme?: Partial<PhantomTheme>): ComputedPhantomWebTheme {
  const secondary = customTheme?.secondary || darkTheme.secondary;
  const isHex = secondary.startsWith("#");

  if (!isHex) {
    throw new Error("Secondary color must be a hex color to derive auxiliary color.");
  }

  return {
    ...darkTheme,
    ...customTheme,
    aux: hexToRgba(secondary, 0.1),
    typography: {
      caption: {
        fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "14px",
        fontStyle: "normal",
        fontWeight: "400",
        lineHeight: "17px",
        letterSpacing: "-0.14px",
      },
      captionBold: {
        fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "14px",
        fontStyle: "normal",
        fontWeight: "600",
        lineHeight: "17px",
        letterSpacing: "-0.14px",
      },
      label: {
        fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "12px",
        fontStyle: "normal",
        fontWeight: "400",
        lineHeight: "15px",
        letterSpacing: "-0.12px",
      },
    },
  };
}

export function mergeThemeNative(customTheme?: Partial<PhantomTheme>): ComputedPhantomNativeTheme {
  const secondary = customTheme?.secondary || darkTheme.secondary;
  const isHex = secondary.startsWith("#");

  if (!isHex) {
    throw new Error("Secondary color must be a hex color to derive auxiliary color.");
  }

  return {
    ...darkTheme,
    ...customTheme,
    aux: hexToRgba(secondary, 0.1),
    typography: {
      caption: {
        fontFamily: "System",
        fontSize: 14,
        fontStyle: "normal",
        fontWeight: "400",
        lineHeight: 17,
        letterSpacing: -0.14,
      },
      captionBold: {
        fontFamily: "System",
        fontSize: 14,
        fontStyle: "normal",
        fontWeight: "600",
        lineHeight: 17,
        letterSpacing: -0.14,
      },
      label: {
        fontFamily: "System",
        fontSize: 12,
        fontStyle: "normal",
        fontWeight: "400",
        lineHeight: 15,
        letterSpacing: -0.12,
      },
    },
  };
}
