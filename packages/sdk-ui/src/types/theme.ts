export interface ColorTokens {
  primary: string;
  primaryHover: string;
  secondary: string;
  secondaryHover: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
}

export interface BackgroundTokens {
  primary: string;
  secondary: string;
  modal: string;
  overlay: string;
  buttonPrimary: string;
  buttonSecondary: string;
  buttonTertiary: string;
}

export interface TextTokens {
  primary: string;
  secondary: string;
  muted: string;
  inverse: string;
  buttonPrimary: string;
  buttonSecondary: string;
  buttonTertiary: string;
}

export interface BorderTokens {
  color: string;
  radius: number;
  radiusLg: number;
  button: string;
}

export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface TypographyTokens {
  fontFamily: string;
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fontWeight: {
    normal: string;
    medium: string;
    bold: string;
  };
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  modal: string;
}

export interface AnimationTokens {
  fast: string;
  normal: string;
  slow: string;
}

export interface Theme {
  colors: ColorTokens;
  backgrounds: BackgroundTokens;
  text: TextTokens;
  borders: BorderTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  shadows: ShadowTokens;
  animation: AnimationTokens;
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}