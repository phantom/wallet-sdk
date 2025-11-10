/**
 * Theme type definitions for Phantom UI
 * Simple theme focused on colors and border radius
 */

import { hexToRgba } from "./utils";

export interface PhantomTheme {
  // Background color for modal
  background: string;

  // Secondary color for text, borders, dividers
  secondary: string;

  // Error color
  error: string;

  // Success color
  success: string;

  // Primary text color
  text: string;

  // Overlay background (with opacity)
  overlay: string;

  // Border radius for buttons and modal
  borderRadius: string;

  // Brand color
  brand: string;
}

export type PhantomThemeWithAux = PhantomTheme & {
  aux: string; // Auxiliary color derived from secondary with opacity
};

export const loginWithPhantomColor = "#7C63E7";
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
