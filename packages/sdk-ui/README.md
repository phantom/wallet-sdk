# @phantom/sdk-ui

Cross-platform UI components for Phantom Wallet SDK that work seamlessly on both React Native and Web platforms.

## Features

- 🎨 **TypeScript-based theming** - No CSS dependencies, works across platforms
- 🌓 **Light/Dark themes** - Built-in theme support with easy customization
- 📱 **Cross-platform** - Single API that works on both React Native and Web
- 🎯 **Platform-specific optimizations** - Leverages platform-specific components under the hood
- 🔧 **TypeScript first** - Full type safety and IntelliSense support

## Installation

```bash
yarn add @phantom/sdk-ui
```

## Usage

### Basic Setup

```tsx
import { ThemeProvider, Button, Text, Image } from '@phantom/sdk-ui';

function App() {
  return (
    <ThemeProvider initialMode="light">
      <Text variant="heading">Welcome to Phantom</Text>
      <Button variant="primary" onPress={() => console.log('Pressed!')}>
        Connect Wallet
      </Button>
      <Image source={{ uri: 'https://example.com/logo.png' }} width={200} height={100} />
    </ThemeProvider>
  );
}
```

### Theme Customization

```tsx
import { ThemeProvider, lightTheme } from '@phantom/sdk-ui';

const customTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary: '#ff6b35', // Custom primary color
  },
};

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      {/* Your components */}
    </ThemeProvider>
  );
}
```

### Using the Theme Hook

```tsx
import { useTheme, Button } from '@phantom/sdk-ui';

function CustomComponent() {
  const { theme, mode, setMode } = useTheme();
  
  return (
    <Button 
      onPress={() => setMode(mode === 'light' ? 'dark' : 'light')}
      style={{ backgroundColor: theme.colors.primary }}
    >
      Toggle Theme
    </Button>
  );
}
```

## Components

### Button

```tsx
<Button 
  variant="primary" // 'primary' | 'secondary' | 'tertiary'
  size="md" // 'sm' | 'md' | 'lg'
  onPress={() => {}}
  disabled={false}
  loading={false}
>
  Click me
</Button>
```

### Text

```tsx
<Text 
  variant="body" // 'caption' | 'body' | 'subheading' | 'heading'
  weight="normal" // 'normal' | 'medium' | 'bold'
  color="#custom-color"
>
  Hello World
</Text>
```

### Image

```tsx
<Image 
  source={{ uri: 'https://example.com/image.png' }}
  width={200}
  height={200}
  resizeMode="cover" // Web: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  // React Native: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
  onLoad={() => console.log('Image loaded')}
  onError={() => console.log('Image failed to load')}
/>
```

## Platform-Specific Implementation

The library automatically selects the appropriate implementation based on your platform:

- **Web**: Uses HTML elements with CSS-in-JS styling
- **React Native**: Uses native components with StyleSheet

The platform detection is handled automatically through package.json exports:

```json
{
  "exports": {
    ".": {
      "browser": "./dist/index.web.js",
      "react-native": "./dist/index.native.js",
      "default": "./dist/index.js"
    }
  }
}
```

## Theme Structure

The theme system is built with TypeScript interfaces for full type safety:

```tsx
interface Theme {
  colors: ColorTokens;
  backgrounds: BackgroundTokens;
  text: TextTokens;
  borders: BorderTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  shadows: ShadowTokens;
  animation: AnimationTokens;
}
```

## Building

```bash
yarn build
```

This will generate platform-specific builds:
- `dist/index.web.js` - Web version
- `dist/index.native.js` - React Native version  
- `dist/index.js` - Default fallback

## Development

```bash
yarn dev
```

Starts the build process in watch mode for development.

## TypeScript Support

The library is built with TypeScript and includes full type definitions. For React Native Web projects, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolvePackageJsonImports": false
  }
}
```

## License

MIT