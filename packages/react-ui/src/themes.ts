/**
 * Theme type definitions for Phantom UI
 * Simple theme focused on colors and border radius
 */

import { hexToRgba } from "./utils";

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

  // Typography
  typography: {
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
  };
}

export type PhantomThemeWithAux = PhantomTheme & {
  aux: string; // Auxiliary color derived from secondary with opacity (rgba format)
};

export const loginWithPhantomColor: HexColor = "#7C63E7";
/**
 * Dark theme configuration
 */
export const darkTheme: PhantomTheme = {
  background: "#181818",
  text: "#FFFFFF",
  secondary: "#98979C",
  overlay: "rgba(0, 0, 0, 0.7)",
  borderRadius: "12px",
  error: "#F00000",
  success: "#1CC700",
  brand: loginWithPhantomColor,
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

/**
 * Light theme configuration
 */
export const lightTheme: PhantomTheme = {
  background: "#FFFFFF",
  text: "#181818",
  secondary: "#98979C",
  overlay: "rgba(0, 0, 0, 0.5)",
  borderRadius: "12px",
  error: "#F00000",
  success: "#1CC700",
  brand: loginWithPhantomColor,
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

/**
 * Merge custom theme with base theme
 */
export function mergeTheme(customTheme?: Partial<PhantomTheme>): PhantomThemeWithAux {
  const secondary = customTheme?.secondary || darkTheme.secondary;
  const isHex = secondary.startsWith("#");

  if (!isHex) {
    throw new Error("Secondary color must be a hex color to derive auxiliary color.");
  }

  return {
    ...darkTheme,
    ...customTheme,
    aux: hexToRgba(secondary, 0.1),
  };
}
