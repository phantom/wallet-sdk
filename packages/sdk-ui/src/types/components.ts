import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BaseButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  testID?: string;
}

export type TextVariant = 'body' | 'caption' | 'heading' | 'subheading';
export type TextWeight = 'normal' | 'medium' | 'bold';

export interface BaseTextProps {
  children: ReactNode;
  variant?: TextVariant;
  weight?: TextWeight;
  color?: string;
  testID?: string;
}

export interface BaseImageProps {
  source: { uri: string } | number;
  width?: number;
  height?: number;
  style?: any;
  testID?: string;
}