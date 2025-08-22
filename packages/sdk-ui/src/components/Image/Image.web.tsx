import React, { useState } from 'react';
import { useTheme } from '../../theme';
import type { BaseImageProps } from '../../types/components';

export interface ImageProps extends BaseImageProps {
  alt?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  resizeMode?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export function Image({ 
  source,
  width,
  height,
  alt = '',
  className,
  style,
  onLoad,
  onError,
  loading = 'lazy',
  resizeMode = 'cover',
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

  const getObjectFit = (): React.CSSProperties['objectFit'] => {
    switch (resizeMode) {
      case 'contain':
        return 'contain';
      case 'cover':
        return 'cover';
      case 'fill':
        return 'fill';
      case 'none':
        return 'none';
      case 'scale-down':
        return 'scale-down';
      default:
        return 'cover';
    }
  };

  const imageStyle: React.CSSProperties = {
    width: width || 'auto',
    height: height || 'auto',
    objectFit: getObjectFit(),
    borderRadius: theme.borders.radius,
    transition: `opacity ${theme.animation.fast}`,
    opacity: imageLoaded ? 1 : 0.8,
    backgroundColor: theme.backgrounds.secondary,
    ...style,
  };

  const placeholderStyle: React.CSSProperties = {
    width: width || '100%',
    height: height || 200,
    backgroundColor: theme.backgrounds.secondary,
    borderRadius: theme.borders.radius,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.text.muted,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily,
  };

  if (imageError) {
    return (
      <div
        className={className}
        style={placeholderStyle}
        data-testid={testID}
      >
        Failed to load image
      </div>
    );
  }

  const src = typeof source === 'object' && 'uri' in source ? source.uri : String(source);

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      className={className}
      style={imageStyle}
      onLoad={handleLoad}
      onError={handleError}
      loading={loading}
      data-testid={testID}
    />
  );
}