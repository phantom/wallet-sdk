import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { ThemeContextValue, ThemeMode, Theme } from '../types/theme';
import { themes } from './tokens';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
  theme?: Partial<Theme>;
}

export function ThemeProvider({ 
  children, 
  initialMode = 'light',
  theme: customTheme 
}: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const theme = useMemo(() => {
    const baseTheme = themes[mode];
    if (!customTheme) return baseTheme;
    
    // Deep merge custom theme with base theme
    return {
      ...baseTheme,
      ...customTheme,
      colors: { ...baseTheme.colors, ...customTheme.colors },
      backgrounds: { ...baseTheme.backgrounds, ...customTheme.backgrounds },
      text: { ...baseTheme.text, ...customTheme.text },
      borders: { ...baseTheme.borders, ...customTheme.borders },
      spacing: { ...baseTheme.spacing, ...customTheme.spacing },
      typography: { 
        ...baseTheme.typography, 
        ...customTheme.typography,
        fontSize: { ...baseTheme.typography.fontSize, ...customTheme.typography?.fontSize },
        fontWeight: { ...baseTheme.typography.fontWeight, ...customTheme.typography?.fontWeight },
      },
      shadows: { ...baseTheme.shadows, ...customTheme.shadows },
      animation: { ...baseTheme.animation, ...customTheme.animation },
    };
  }, [mode, customTheme]);

  const contextValue = useMemo(() => ({
    theme,
    mode,
    setMode,
  }), [theme, mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}