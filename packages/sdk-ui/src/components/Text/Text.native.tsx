import { Text as RNText, TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import type { BaseTextProps } from '../../types/components';

export interface TextProps extends BaseTextProps {
  style?: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}

export function Text({ 
  children, 
  variant = 'body', 
  weight = 'normal',
  color,
  style,
  numberOfLines,
  ellipsizeMode,
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

  const getFontWeight = (): TextStyle['fontWeight'] => {
    switch (weight) {
      case 'normal':
        return '400';
      case 'medium':
        return '500';
      case 'bold':
        return '600';
      default:
        return '400';
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

  const getLineHeight = () => {
    const fontSize = getFontSize();
    switch (variant) {
      case 'caption':
        return fontSize * 1.4;
      case 'body':
        return fontSize * 1.5;
      case 'subheading':
        return fontSize * 1.4;
      case 'heading':
        return fontSize * 1.2;
      default:
        return fontSize * 1.5;
    }
  };

  const textStyle: TextStyle = {
    color: color || getDefaultColor(),
    fontSize: getFontSize(),
    fontWeight: getFontWeight(),
    lineHeight: getLineHeight(),
    ...style,
  };

  return (
    <RNText
      {...props}
      style={textStyle}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      testID={testID}
    >
      {children}
    </RNText>
  );
}