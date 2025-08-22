import { useState } from 'react';
import { Image as RNImage, View, Text, ImageStyle, ViewStyle, ImageResizeMode } from 'react-native';
import { useTheme } from '../../theme';
import type { BaseImageProps } from '../../types/components';

export interface ImageProps extends BaseImageProps {
  onLoad?: () => void;
  onError?: () => void;
  resizeMode?: ImageResizeMode;
  containerStyle?: ViewStyle;
}

export function Image({ 
  source,
  width,
  height,
  style,
  onLoad,
  onError,
  resizeMode = 'cover',
  containerStyle,
  testID,
  ...props 
}: ImageProps) {
  const { theme } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  const imageStyle: ImageStyle = {
    width: width || '100%',
    height: height || 200,
    borderRadius: theme.borders.radius,
    backgroundColor: theme.backgrounds.secondary,
    ...style as ImageStyle,
  };

  const placeholderStyle: ViewStyle = {
    width: width || '100%',
    height: height || 200,
    backgroundColor: theme.backgrounds.secondary,
    borderRadius: theme.borders.radius,
    alignItems: 'center',
    justifyContent: 'center',
    ...containerStyle,
  };

  const placeholderTextStyle = {
    color: theme.text.muted,
    fontSize: theme.typography.fontSize.sm,
  };

  if (imageError) {
    return (
      <View style={placeholderStyle} testID={testID}>
        <Text style={placeholderTextStyle}>
          Failed to load image
        </Text>
      </View>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      <RNImage
        {...props}
        source={source}
        style={imageStyle}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode={resizeMode}
      />
      {!imageLoaded && (
        <View style={[placeholderStyle, { position: 'absolute', top: 0, left: 0 }]}>
          <Text style={placeholderTextStyle}>
            Loading...
          </Text>
        </View>
      )}
    </View>
  );
}