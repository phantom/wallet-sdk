import { createContext, useContext, type ReactNode } from "react";
import type { CompletePhantomTheme } from "./index";
import { darkTheme, mergeTheme } from "./index";

export interface ThemeContextValue {
  theme: CompletePhantomTheme;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  theme?: Partial<CompletePhantomTheme>;
}

/**
 * ThemeProvider for wallet-sdk-ui components.
 * Provides theme context to all child components.
 */
export function ThemeProvider({ children, theme }: ThemeProviderProps) {
  const resolvedTheme = mergeTheme(theme || darkTheme);

  return <ThemeContext.Provider value={{ theme: resolvedTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): CompletePhantomTheme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context.theme;
}
