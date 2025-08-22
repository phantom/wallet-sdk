import type { Theme } from '../types/theme';

export const lightTheme: Theme = {
  colors: {
    primary: '#ab9ff2',
    primaryHover: '#9c8dff',
    secondary: '#6c757d',
    secondaryHover: '#545b62',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
  },
  backgrounds: {
    primary: '#ffffff',
    secondary: '#f8f9fa',
    modal: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
    buttonPrimary: '#ab9ff2',
    buttonSecondary: 'transparent',
    buttonTertiary: '#f8f9fa',
  },
  text: {
    primary: '#212529',
    secondary: '#6c757d',
    muted: '#868e96',
    inverse: '#ffffff',
    buttonPrimary: '#ffffff',
    buttonSecondary: '#ab9ff2',
    buttonTertiary: '#212529',
  },
  borders: {
    color: '#dee2e6',
    radius: 8,
    radiusLg: 12,
    button: '1px solid #ab9ff2',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      bold: '600',
    },
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    modal: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },
  animation: {
    fast: '0.15s ease',
    normal: '0.25s ease',
    slow: '0.35s ease',
  },
};

export const darkTheme: Theme = {
  colors: {
    primary: '#ab9ff2',
    primaryHover: '#9c8dff',
    secondary: '#8e95a0',
    secondaryHover: '#a1a8b3',
    success: '#34d058',
    danger: '#f85149',
    warning: '#ffb347',
    info: '#58a6ff',
  },
  backgrounds: {
    primary: '#0d1117',
    secondary: '#161b22',
    modal: '#21262d',
    overlay: 'rgba(0, 0, 0, 0.8)',
    buttonPrimary: '#ab9ff2',
    buttonSecondary: 'transparent',
    buttonTertiary: '#21262d',
  },
  text: {
    primary: '#f0f6fc',
    secondary: '#8b949e',
    muted: '#6e7681',
    inverse: '#0d1117',
    buttonPrimary: '#ffffff',
    buttonSecondary: '#ab9ff2',
    buttonTertiary: '#f0f6fc',
  },
  borders: {
    color: '#30363d',
    radius: 8,
    radiusLg: 12,
    button: '1px solid #ab9ff2',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      bold: '600',
    },
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
    modal: '0 20px 25px rgba(0, 0, 0, 0.5)',
  },
  animation: {
    fast: '0.15s ease',
    normal: '0.25s ease',
    slow: '0.35s ease',
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};