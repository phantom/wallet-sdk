# Phantom React Native SDK Demo App

This demo application showcases the usage of the `@phantom/react-native-sdk` with embedded provider support for React Native/Expo applications.

## Features

- **Embedded Provider Support**: Server-based wallet management with secure authentication
- **Multiple Authentication Methods**: Support for Google, Apple, and JWT authentication
- **Cross-Platform**: Works on both iOS and Android using Expo
- **Secure Storage**: Hardware-backed secure storage using Expo SecureStore
- **OAuth Authentication**: Secure web-based authentication flows using Expo WebBrowser
- Display connected wallet addresses (Solana and other supported chains)
- Sign messages with base64url encoding
- Sign and send Solana transactions
- Disconnect from wallet
- **Deep Link Handling**: Automatic handling of authentication callbacks via deep links

## Prerequisites

- Node.js 16+ and Yarn
- Expo CLI (`npm install -g @expo/cli`)
- For iOS development: Xcode and iOS Simulator
- For Android development: Android Studio and Android Emulator

## Getting Started

1. From the monorepo root, install dependencies:

   ```bash
   yarn install
   ```

2. Build the SDK packages:

   ```bash
   yarn build
   ```

3. **Configure Environment Variables**:

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and fill in your values:
   # - EXPO_PUBLIC_ORGANIZATION_ID: Your Phantom organization ID
   # - EXPO_PUBLIC_WALLET_API: Phantom API URL
   # - Other optional configurations
   ```

   See [Environment Variables](#environment-variables) section for details.

4. Start the demo app:

   ```bash
   # Start the development server
   yarn start

   # Or run directly on iOS/Android
   yarn ios
   yarn android
   ```

5. The app will open in Expo Go or your simulator/emulator

## Usage

1. **Authentication**: Choose between Google, Apple, or JWT authentication methods
2. **Connect**: Tap the "Connect" button to initiate the authentication flow
3. **Authentication Flow**: The app will open a web browser for secure authentication
4. **Callback Handling**: After successful authentication, you'll be redirected back to the app
5. **Wallet Operations**: Once connected, you can:
   - View your wallet addresses
   - Sign messages
   - Sign transactions (demo implementation)
   - Disconnect from the wallet

## Architecture

This demo uses:

- `@phantom/react-native-sdk` - The React Native SDK with hooks for wallet interactions
- **Embedded Provider**: Server-based wallet management with multiple authentication options
- **Expo Router**: File-based routing system for navigation
- **Platform Adapters**:
  - **ExpoSecureStorage**: Hardware-backed secure storage for session management
  - **ExpoAuthProvider**: OAuth authentication flows using Expo WebBrowser
  - **ExpoURLParamsAccessor**: Deep link parameter handling for authentication callbacks
- Base64url encoding - All messages and transactions are encoded in base64url format

## Environment Variables

The demo app uses environment variables for configuration. Copy `.env.example` to `.env` and configure:

### Required Configuration

- `EXPO_PUBLIC_ORGANIZATION_ID` - Your Phantom organization ID (get from Phantom developer dashboard)
- `EXPO_PUBLIC_WALLET_API` - Phantom API URL (`https://api.phantom.app/v1/wallets` for production)

### App Configuration

- `EXPO_PUBLIC_APP_SCHEME` - Deep link scheme for your app (default: "phantom-rn-demo")
- `EXPO_PUBLIC_EMBEDDED_WALLET_TYPE` - Embedded wallet type: `"app-wallet"` or `"user-wallet"` (default: "app-wallet")

### Authentication URLs

- `EXPO_PUBLIC_AUTH_URL` - Authentication URL (default: production auth URL)
- `EXPO_PUBLIC_REDIRECT_URL` - Deep link URL for authentication callbacks

### Debug Settings

- `EXPO_PUBLIC_DEBUG` - Enable debug logging (default: "true")

## Configuration

The app is configured in `app/_layout.tsx` using environment variables:

```typescript
const config = {
  appId: process.env.EXPLO_PUBLIC_APP_ID || "your-app-id",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "phantom-rn-demo",
  embeddedWalletType: (process.env.EXPO_PUBLIC_EMBEDDED_WALLET_TYPE || "user-wallet") as const,
  addressTypes: [AddressType.solana],
  authOptions: {
    authUrl: process.env.EXPO_PUBLIC_AUTH_URL,
    redirectUrl: process.env.EXPO_PUBLIC_REDIRECT_URL || "phantom-rn-demo://phantom-auth-callback",
  },
  apiBaseUrl: process.env.EXPO_PUBLIC_WALLET_API || "https://api.phantom.app/v1/wallets",
  debug: process.env.EXPO_PUBLIC_DEBUG === "true",
};
```

## App Structure

```
app/
├── _layout.tsx          # Root layout with PhantomProvider
├── index.tsx            # Home screen with connection UI
├── wallet.tsx           # Wallet operations screen
└── auth-callback.tsx    # Authentication callback handler
```

### Screen Flow

1. **Home Screen (`index.tsx`)**:
   - Display connection status
   - Provide authentication options (Google, Apple, JWT)
   - Handle initial wallet connection

2. **Wallet Operations Screen (`wallet.tsx`)**:
   - Display connected wallet information
   - Message signing functionality
   - Transaction signing (demo)
   - Disconnect functionality

3. **Auth Callback Screen (`auth-callback.tsx`)**:
   - Handle authentication redirects
   - Complete wallet connection process
   - Display success/error states

## Deep Link Configuration

The app uses deep links for authentication callbacks. The scheme is configured in:

- `app.json`: Expo configuration with the app scheme
- `.env`: Environment variables for redirect URLs
- Platform adapters handle the URL parameter parsing

## Network Support

- **Embedded Provider**: Supports multiple networks including Solana, Ethereum, and other chains
- **Primary Focus**: Solana network operations for message signing and transactions

## Development

The demo app uses:

- React Native with Expo SDK 52
- TypeScript
- Expo Router for navigation
- Expo SecureStore for secure storage
- Expo WebBrowser for OAuth flows
- @phantom/react-native-sdk for wallet integration

## Platform-Specific Features

### iOS

- Hardware Security Module (HSM) backed secure storage
- Native authentication flows
- Deep link handling through iOS URL schemes

### Android

- Android Keystore backed secure storage
- Chrome Custom Tabs for authentication
- Intent-based deep link handling

## Troubleshooting

### Connection Issues

1. **Deep link not working**:
   - Ensure the app scheme in `app.json` matches your environment variables
   - Check that the redirect URL is properly formatted
   - Clear app data and reinstall if necessary

2. **Authentication failures**:
   - Verify your organization ID is correct
   - Check browser popup blockers aren't interfering
   - Ensure your device has internet connectivity

3. **Secure storage errors**:
   - On iOS: Ensure device passcode/biometric is enabled
   - On Android: Check device security settings
   - Clear app data if encountering storage conflicts

### Build Issues

1. **SDK build errors**: Make sure all packages are built with `yarn build`
2. **Metro bundler issues**: Clear Metro cache with `npx expo start -c`
3. **Platform-specific issues**: Check Expo documentation for platform requirements

### Runtime Issues

1. **Provider not found**: Ensure the embedded provider core is properly initialized
2. **Network errors**: Check API endpoints and network connectivity
3. **Transaction failures**: Verify wallet has sufficient funds for transaction fees

## Learn More

- [Phantom React Native SDK Documentation](../../packages/react-native-sdk/README.md)
- [Expo Documentation](https://docs.expo.dev)
- [Phantom Wallet](https://phantom.app)
- [Solana Documentation](https://docs.solana.com)
