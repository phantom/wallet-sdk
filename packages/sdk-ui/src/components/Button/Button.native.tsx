import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import type { BaseButtonProps } from '../../types/components';

export interface ButtonProps extends BaseButtonProps {
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
  testID,
  ...props 
}: ButtonProps) {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return theme.backgrounds.buttonPrimary;
      case 'secondary':
        return 'transparent';
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
        return {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
        };
      case 'md':
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        };
      case 'lg':
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        };
      default:
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        };
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

  const buttonStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius: theme.borders.radius,
    borderWidth: variant === 'secondary' ? 1 : 0,
    borderColor: variant === 'secondary' ? theme.colors.primary : 'transparent',
    opacity: disabled || loading ? 0.6 : 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...getPadding(),
    ...style,
  };

  const buttonTextStyle: TextStyle = {
    color: getTextColor(),
    fontSize: getFontSize(),
    fontWeight: parseInt(theme.typography.fontWeight.medium) as any,
    textAlign: 'center',
    ...textStyle,
  };

  return (
    <TouchableOpacity
      {...props}
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      testID={testID}
    >
      <Text style={buttonTextStyle}>
        {loading ? 'Loading...' : children}
      </Text>
    </TouchableOpacity>
  );
}