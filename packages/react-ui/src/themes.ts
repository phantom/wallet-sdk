/**
 * Theme type definitions for Phantom UI
 * Simple theme focused on colors and border radius
 */

export interface PhantomTheme {
  // Background color for modal
  background: string;

  // Primary color for buttons and accents
  primary: string;

  // Secondary color for text, borders, dividers
  secondary: string;

  // Primary text color
  text: string;

  // Overlay background (with opacity)
  overlay: string;

  // Border radius for buttons and modal
  borderRadius: string;
}

/**
 * Dark theme configuration
 */
export const darkTheme: PhantomTheme = {
  background: '#181818',
  primary: '#98979C',
  secondary: '#98979C',
  text: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.7)',
  borderRadius: '12px',
};

/**
 * Light theme configuration
 */
export const lightTheme: PhantomTheme = {
  background: '#FFFFFF',
  primary: '#ab9ff2',
  secondary: '#6c757d',
  text: '#212529',
  overlay: 'rgba(0, 0, 0, 0.5)',
  borderRadius: '12px',
};

/**
 * Get theme by name
 */
export function getTheme(themeName: 'light' | 'dark' | 'auto'): PhantomTheme {
  if (themeName === 'auto') {
    // Check system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? darkTheme : lightTheme;
  }

  return themeName === 'dark' ? darkTheme : lightTheme;
}

/**
 * Merge custom theme with base theme
 */
export function mergeTheme(baseTheme: PhantomTheme, customTheme?: Partial<PhantomTheme>): PhantomTheme {
  if (!customTheme) return baseTheme;

  return {
    ...baseTheme,
    ...customTheme,
  };
}
