import React from 'react';
import { useTheme } from '../../theme';
import type { BaseButtonProps } from '../../types/components';

export interface ButtonProps extends BaseButtonProps {
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  onPress,
  onClick,
  className,
  style,
  testID,
  ...props 
}: ButtonProps) {
  const { theme } = useTheme();

  const handleClick = () => {
    if (disabled || loading) return;
    onClick?.();
    onPress?.();
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return theme.backgrounds.buttonPrimary;
      case 'secondary':
        return theme.backgrounds.buttonSecondary;
      case 'tertiary':
        return theme.backgrounds.buttonTertiary;
      default:
        return theme.backgrounds.buttonPrimary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return theme.text.buttonPrimary;
      case 'secondary':
        return theme.text.buttonSecondary;
      case 'tertiary':
        return theme.text.buttonTertiary;
      default:
        return theme.text.buttonPrimary;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return `${theme.spacing.xs}px ${theme.spacing.sm}px`;
      case 'md':
        return `${theme.spacing.sm}px ${theme.spacing.md}px`;
      case 'lg':
        return `${theme.spacing.md}px ${theme.spacing.lg}px`;
      default:
        return `${theme.spacing.sm}px ${theme.spacing.md}px`;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return theme.typography.fontSize.sm;
      case 'md':
        return theme.typography.fontSize.md;
      case 'lg':
        return theme.typography.fontSize.lg;
      default:
        return theme.typography.fontSize.md;
    }
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: getBackgroundColor(),
    color: getTextColor(),
    border: variant === 'secondary' ? theme.borders.button : 'none',
    borderRadius: theme.borders.radius,
    padding: getPadding(),
    fontSize: getFontSize(),
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.medium,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: `all ${theme.animation.fast}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    textDecoration: 'none',
    userSelect: 'none',
    ...style,
  };

  return (
    <button
      {...props}
      className={className}
      style={buttonStyle}
      onClick={handleClick}
      disabled={disabled || loading}
      data-testid={testID}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}