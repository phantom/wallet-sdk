import React from 'react';
import { useTheme } from '../../theme';
import type { BaseTextProps } from '../../types/components';

export interface TextProps extends BaseTextProps {
  className?: string;
  style?: React.CSSProperties;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function Text({ 
  children, 
  variant = 'body', 
  weight = 'normal',
  color,
  className,
  style,
  as: Component = 'p',
  testID,
  ...props 
}: TextProps) {
  const { theme } = useTheme();

  const getFontSize = () => {
    switch (variant) {
      case 'caption':
        return theme.typography.fontSize.xs;
      case 'body':
        return theme.typography.fontSize.md;
      case 'subheading':
        return theme.typography.fontSize.lg;
      case 'heading':
        return theme.typography.fontSize.xl;
      default:
        return theme.typography.fontSize.md;
    }
  };

  const getFontWeight = () => {
    switch (weight) {
      case 'normal':
        return theme.typography.fontWeight.normal;
      case 'medium':
        return theme.typography.fontWeight.medium;
      case 'bold':
        return theme.typography.fontWeight.bold;
      default:
        return theme.typography.fontWeight.normal;
    }
  };

  const getDefaultColor = () => {
    switch (variant) {
      case 'caption':
        return theme.text.muted;
      case 'body':
        return theme.text.primary;
      case 'subheading':
        return theme.text.primary;
      case 'heading':
        return theme.text.primary;
      default:
        return theme.text.primary;
    }
  };

  const textStyle: React.CSSProperties = {
    color: color || getDefaultColor(),
    fontSize: getFontSize(),
    fontFamily: theme.typography.fontFamily,
    fontWeight: getFontWeight(),
    margin: 0,
    padding: 0,
    lineHeight: variant === 'heading' ? '1.2' : '1.5',
    ...style,
  };

  return (
    <Component
      {...props}
      className={className}
      style={textStyle}
      data-testid={testID}
    >
      {children}
    </Component>
  );
}