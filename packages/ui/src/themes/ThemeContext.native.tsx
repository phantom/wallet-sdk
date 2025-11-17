import { createContext, useContext, type ReactNode } from "react";
import type { CompletePhantomNativeTheme } from "./index";
import { darkTheme, mergeThemeNative } from "./index";

export interface ThemeContextValue {
  theme: CompletePhantomNativeTheme;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  theme?: Partial<CompletePhantomNativeTheme>;
}

/**
 * ThemeProvider for wallet-sdk-ui components in React Native.
 * Provides theme context with native typography (unitless numbers instead of px strings).
 */
export function ThemeProvider({ children, theme }: ThemeProviderProps) {
  const resolvedTheme = mergeThemeNative(theme || darkTheme);

  return <ThemeContext.Provider value={{ theme: resolvedTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): CompletePhantomNativeTheme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context.theme;
}
